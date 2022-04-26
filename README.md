# encrypted

_DEPRECATED_ Google Cloud Platform has [Secret Manager](https://cloud.google.com/secret-manager) that solves the problem 

## Use Case

You have a backend app/service/function you deploy on GCP with Cloud Functions, App Engine, etc. It requires some secret variables to pass in order to configure the deployment. You want to keep these secrets in deployments scripts, on CI, wherether. You should take care of encryption in order to don't compromise this data. The solution this libriry provides is
1. Encrypt secrets using KMS
2. Set environment variables with encrypted values
3. Use `encrypted.decryptProcessEnv` to decrypt `process.env`

## Installation

```bash
npm install @msp/encrypted
```

## Setup

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
const { decryptProcessEnv } = require('@msp/encrypted')

decryptProcessEnv().then(env => {
  const { API_KEY } = env
  initThirdPartySDK(API_KEY)
})
```

#### Firebase Functions

Firebase Functions does not provide a tool to setup ENV variables (in contrast to original Cloud Functions). However it has it's own tooling https://firebase.google.com/docs/functions/config-env.

```bash
# [optional] Configure KMS project if it's different from where you deploy functions
firebase functions:config:set kms.project=PROJECT_ID

# [optional] Configure KMS location if it's not "global" (the default)
firebase functions:config:set kms.location=LOCATION_NAME

# Configure KMS key ring and crypto key
firebase functions:config:set kms.ring=staging kms.key=secret-env
```

Configure the app with your secrets.

```bash
# You can either add suffix
firebase functions:config:set api.keyencrypted=CiQAXB10DCPLUaOac...

# ...or as a nested object ".encrypted"
firebase functions:config:set api.key.encrypted=CiQAXB10DCPLUaOac...
```

Usage example

```javascript
const functions = require('firebase-functions')
const { decrypt } = require('@msp/encrypted')

const config = functions.config()
decrypt(config, config.kms).then(env => {
  initThirdPartySDK(env.api.key)
})
```
