# Security Notes

## Credentials

- This workspace is designed so browser code does not carry long-lived cloud credentials.
- Local development uses Google Cloud authentication through `gcloud auth print-access-token` inside the shared proxy layer.
- `.env` files are for local configuration only and should not be committed.

## Public Repo Expectations

- Do not commit private `.env` files, local auth artifacts, or internal notes.
- If you fork this project, use your own Google Cloud project and billing configuration.
- Review the root `.gitignore` before your first commit to make sure local-only files stay excluded.

## Reporting

If you discover a security issue in the shared proxy or credential flow, please open a private report with the repository owner rather than posting exploit details publicly in an issue.
