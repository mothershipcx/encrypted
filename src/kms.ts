import * as kms from '@google-cloud/kms'

export function getDecryptor() {
  const client = new kms.v1.KeyManagementServiceClient()
  const e = process.env
  const projectId =
    e.KMS_PROJECT_ID ||
    e.GOOGLE_CLOUD_PROJECT || // App Engine
    e.GCP_PROJECT || // Cloud Functions
    e.GCLOUD_PROJECT // Cloud Functions (deprecated)
  const formattedName = client.cryptoKeyPath(
    projectId,
    e.KMS_LOCATION || 'global',
    e.KMS_KEY_RING,
    e.KMS_CRYPTO_KEY
  )
  return async (ciphertext: string) => {
    const result = await client.decrypt({ ciphertext, name: formattedName })
    return result[0].plaintext.toString()
  }
}
