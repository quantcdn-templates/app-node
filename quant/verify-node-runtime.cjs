// CVE-2026-111497: security floors for supported Node release lines.
const minimums = { 22: [22, 23, 4], 24: [24, 22, 1], 26: [26, 12, 1] };
const actual = process.versions.node.split('.').map(Number);
const minimum = minimums[actual[0]];
const patched = minimum && (actual[1] > minimum[1] ||
  (actual[1] === minimum[1] && actual[2] >= minimum[2]));
if (!patched) {
  throw new Error(`Unsupported or unpatched Node ${process.versions.node}; requires Node 22.23.4, 24.22.1, 26.12.1 or a later patch in those lines`);
}
console.log(`Verified patched Node ${process.versions.node}`);
