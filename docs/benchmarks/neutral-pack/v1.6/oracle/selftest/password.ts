// Password command of the self-test adapter (pack v1.6): node selftest/password.ts <account>
// Prints that account's password once, from SELFTEST_PASSWORD_<ACCOUNT>, which selftest/run.ts
// builds at random for each mapped case. Exits 1, printing nothing, when it is unset.
const account = process.argv[2] ?? "";
const value = /^(alice|bob|operator)$/.test(account)
	? process.env[`SELFTEST_PASSWORD_${account.toUpperCase()}`]
	: undefined;
if (!value) {
	process.stderr.write(`no self-test password for account "${account}"\n`);
	process.exit(1);
}
process.stdout.write(`${value}\n`);
