# encrypted

_NOTE_ The solution is for Google Cloud Platform only

## Use Case

You have a backend app/service/function you deploy on GCP with Cloud Functions, App Engine, etc. It requires some secret variables to pass in order to configure the deployment. You want to keep these secrets in deployments scripts, on CI, wherether. You should take care of encryption in order to don't compromise this data.

## The Solution

1. Encrypt secrets using KMS
2. Set environment variables with encrypted values
3. Use `encrypted.decryptProcessEnv` to decrypt `process.env`

## The Setup

### Encrypt Secrets

For example, we have use a third-party api and need to store an API key `1e0cb178-94b0-4bd7-aa09-c6420d3c3fcd`. We use `gcloud kms encrypt` to encrypt the value. The encode it with `base64` to make it easy to setup deployment scripts.

```bash
echo -n 1e0cb178-94b0-4bd7-aa09-c6420d3c3fcd | gcloud kms encrypt --plaintext-file=- --ciphertext-file=- --location=global --keyring=staging --key=secret-env | base64

# OUTPUT CiQAXB10DCPLUaOacYer8fSiDhOBfIzcPVIgca3xPknD4uIn5usSTQBnUYsj7wJ3iVNSGyMESdIs+KkVjvzq1gkoy+nlok/L0jYXI4aFSYuQxKn3FwwRZZBSqqc0i7qpL0L7MfGhWCkZ/cIrtVZMCqyaEqS1
```

### Configure Deployments

You should setup the library and specify environment variables for KMS config.

- **Project ID**. In case of _App Engine_ and _Cloud Function_ you can skip this, if you have KMS in the same project. Otherwise you should provide `KMS_PROJECT_ID`.
- **Location**. Specify a location on the crypto key's key ring with `KMS_LOCATION`. It's `global` by default.
- **Key Ring**. Specify a name of the key ring with `KMS_KEY_RING`.
- **Crypto Key**. Specify a name of the crypto key with `KMS_CRYPTO_KEY`.

#### App Engine

```yaml
# app.yml
service: default
runtime: nodejs10

env_variables:
  KMS_KEY_RING: 'staging'
  KMS_CRYPTO_KEY: 'secret-env'
  # You'll get it as API_KEY after decription
  API_KEY_ENCRYPTED: 'CiQAXB10DCPLUaOacYer8fSiDhOBfIzcPVIgca3xPknD4uIn5usSTQBnUYsj7wJ3iVNSGyMESdIs+KkVjvzq1gkoy+nlok/L0jYXI4aFSYuQxKn3FwwRZZBSqqc0i7qpL0L7MfGhWCkZ/cIrtVZMCqyaEqS1'
```

```javascript
// index.js
import { decryptProcessEnv } from '@msp/encrypted'

decryptProcessEnv().then(env => {
  const { API_KEY } = env
  initThirdPartySDK(API_KEY)
})
```
