// Live HTTP verification of authentication, shared patient selection,
// audit logging, and the role permission matrix. Read-only for patients;
// at most one draft laboratory request may be created (never deleted).
require('dotenv').config();

const BASE = 'http://127.0.0.1:3000';

const ACCOUNTS = [
    { key: 'LAB_TEST', username: 'labtechnician_test', role: 'lab_technologist' },
    { key: 'LAB_RECEPTIONIST', username: 'labreceptionist_test', role: 'lab_receptionist' },
    { key: 'LAB_ADMIN', username: 'labadmin_dev', role: 'lab_admin' },
    { key: 'LAB_CLINICIAN', username: 'labclinician_dev', role: 'requesting_clinician' }
];

function cookieFrom(response) {
    const values = response.headers.getSetCookie
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);
    for (const value of values) {
        const match = value.match(/medilink\.sid=[^;]+/);
        if (match) return match[0];
    }
    return null;
}

async function call(path, { method = 'GET', cookie, body } = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (body) headers['content-type'] = 'application/json';

    let response;
    try {
        response = await fetch(BASE + path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            redirect: 'manual'
        });
    } catch (error) {
        console.error(`  FETCH ERROR ${method} ${path}: ${error.message}`, error.cause || '');
        throw error;
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { status: response.status, data, cookie: cookieFrom(response) };
}

function expectStatus(label, actual, expected) {
    const ok = actual === expected;
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}: expected ${expected}, got ${actual}`);
    if (!ok) process.exitCode = 1;
}

function containsSecretKey(value) {
    if (Array.isArray(value)) return value.some(containsSecretKey);
    if (value && typeof value === 'object') {
        return Object.entries(value).some(([key, child]) =>
            key === 'password' || key === 'passwordHash' || containsSecretKey(child)
        );
    }
    return false;
}

function expectNoHash(label, value) {
    const ok = !containsSecretKey(value);
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}: no password/hash exposed`);
    if (!ok) process.exitCode = 1;
}

async function main() {
    console.log('==========================================');
    console.log(' LIVE AUTH AND PERMISSION VERIFICATION');
    console.log('==========================================');

    let clinicianSession = null;

    for (const spec of ACCOUNTS) {
        const password = process.env[`${spec.key}_PASSWORD`];
        if (!password) throw new Error(`Missing ${spec.key}_PASSWORD in .env`);

        console.log(`\n---- ${spec.username} ----`);

        const login = await call('/api/v1/auth/login', {
            method: 'POST',
            body: { identifier: spec.username, password }
        });
        expectStatus('login', login.status, 200);
        expectNoHash('login response', login.data);
        if (login.status !== 200) continue;

        const loggedInRole = login.data?.data?.user?.role;
        console.log(`  role from login: ${loggedInRole}`);
        if (loggedInRole !== spec.role) {
            console.log(`  FAIL expected role ${spec.role}`);
            process.exitCode = 1;
        }
        if (!login.cookie) {
            console.log('  FAIL no session cookie returned');
            process.exitCode = 1;
            continue;
        }
        const cookie = login.cookie;

        const me = await call('/api/v1/auth/me', { cookie });
        expectStatus('current-user endpoint', me.status, 200);
        expectNoHash('current-user endpoint', me.data);
        if (me.data?.data?.user?.username !== spec.username) {
            console.log('  FAIL current-user username mismatch');
            process.exitCode = 1;
        }

        // ---- Permission matrix probes (no destructive operations) ----
        const probes = [
            ['GET patients', '/api/v1/patients', 'GET', undefined, 200],
            ['GET lab requests', '/api/v1/lab-requests', 'GET', undefined, 200],
            ['GET test catalog', '/api/v1/test-catalog', 'GET', undefined, 200],
            ['POST lab request (invalid body)', '/api/v1/lab-requests', 'POST', {}, spec.role === 'lab_technologist' ? 403 : 400],
            ['PATCH draft (unknown id)', '/api/v1/lab-requests/000000000000000000000000', 'PATCH', { clinicalNotes: 'probe' }, spec.role === 'lab_technologist' ? 403 : 404],
            ['POST specimen (unknown request)', '/api/v1/specimens', 'POST', { requestId: '000000000000000000000000' }, ['lab_receptionist', 'requesting_clinician'].includes(spec.role) ? 403 : 404],
            ['POST result (invalid request id)', '/api/v1/results', 'POST', { requestId: 'invalid-id' }, spec.role === 'lab_technologist' ? 400 : 403],
            ['PATCH verify result (unknown id)', '/api/v1/results/000000000000000000000000/verify', 'PATCH', {}, 403],
            ['PATCH test catalog (unknown id)', '/api/v1/test-catalog/000000000000000000000000', 'PATCH', { testName: 'probe' }, spec.role === 'lab_admin' ? 404 : 403],
            ['GET audit logs', '/api/v1/audit-logs', 'GET', undefined, spec.role === 'lab_admin' ? 200 : 403],
            ['GET specimens', '/api/v1/specimens', 'GET', undefined, spec.role === 'requesting_clinician' ? 403 : 200],
            ['GET results', '/api/v1/results', 'GET', undefined, ['lab_technologist', 'lab_admin'].includes(spec.role) ? 200 : 403]
        ];

        for (const [label, path, method, body, expected] of probes) {
            const probe = await call(path, { method, cookie, body });
            expectStatus(label, probe.status, expected);
        }

        // ---- Patient selection against the shared collection ----
        const patientSearch = await call('/api/v1/patients?limit=5', { cookie });
        expectStatus('search existing patient', patientSearch.status, 200);
        const patients = patientSearch.data?.data?.patients || [];
        if (!Array.isArray(patients)) {
            console.log('  FAIL patient search payload shape');
            process.exitCode = 1;
        }

        const byId = patients.length
            ? await call(`/api/v1/patients/${patients[0]._id}`, { cookie })
            : null;
        if (byId) {
            expectStatus('get patient by MongoDB _id', byId.status, 200);
            if (byId.data?.data?.patient?._id !== patients[0]._id) {
                console.log('  FAIL patient _id mismatch');
                process.exitCode = 1;
            }
        }

        if (spec.role === 'requesting_clinician') {
            clinicianSession = cookie;
        }

        const logout = await call('/api/v1/auth/logout', { method: 'POST', cookie });
        expectStatus('logout', logout.status, 200);
        const afterLogout = await call('/api/v1/auth/me', { cookie });
        expectStatus('current-user after logout', afterLogout.status, 401);
    }

    // ---- Ownership flow: clinician creates a draft for an existing patient ----
    if (clinicianSession) {
        console.log('\n---- Clinician ownership flow ----');
        // The first session was destroyed by logout; start a fresh one.
        const clinicianPassword = process.env.LAB_CLINICIAN_PASSWORD;
        const freshLogin = await call('/api/v1/auth/login', {
            method: 'POST',
            body: { identifier: 'labclinician_dev', password: clinicianPassword }
        });
        expectStatus('re-login clinician for ownership flow', freshLogin.status, 200);
        clinicianSession = freshLogin.cookie;
        const patients = await call('/api/v1/patients?limit=5', { cookie: clinicianSession });
        const firstPatient = patients.data?.data?.patients?.[0];
        if (!firstPatient) {
            console.log('  FAIL no shared patient available for request test');
            process.exitCode = 1;
        } else {
            const created = await call('/api/v1/lab-requests', {
                method: 'POST',
                cookie: clinicianSession,
                body: { patientId: firstPatient._id, testIds: [], priority: 'routine' }
            });
            expectStatus('create own draft request', created.status, 201);
            const request = created.data?.data?.laboratoryRequest;
            if (request) {
                console.log(`  created request ${request.requestNumber}`);
                if (String(request.patient) !== String(firstPatient._id)) {
                    console.log('  FAIL request does not reference the shared patient _id');
                    process.exitCode = 1;
                }
                const detail = await call(`/api/v1/lab-requests/${request._id}`, { cookie: clinicianSession });
                expectStatus('read own request', detail.status, 200);
                if (String(detail.data?.data?.laboratoryRequest?.patient?._id) !== String(firstPatient._id)) {
                    console.log('  FAIL populated patient is not the shared patient');
                    process.exitCode = 1;
                }
            }
        }
    }

    console.log('\nVerification complete.');
}

main().catch((error) => {
    console.error('Verification error:', error.message);
    process.exitCode = 1;
});
