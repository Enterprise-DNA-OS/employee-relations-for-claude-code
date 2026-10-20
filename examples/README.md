# Example Salesforce exports

Two small files in the shape a Salesforce report exports (Reports, Export, Details Only, comma-separated):

- `employees.csv`: an Employees report. Import first: `node scripts/cases.mjs import salesforce examples/salesforce/employees.csv --kind=people --actor="Your name" --dry-run`
- `cases.csv`: a Cases report filtered to HR cases. Then: `node scripts/cases.mjs import salesforce examples/salesforce/cases.csv --kind=cases --country=NZ --actor="Your name" --dry-run`

The names and numbers are made up. See `docs/replace-salesforce-hr-service.md` for the headings each import reads.
