import * as kms from '@google-cloud/kms'

export function getDecryptor() {
  const client = new kms.v1.KeyManagementServiceClient()
  const formattedName = client.cryptoKeyPath(
    process.env.PROJECT_ID,
    process.env.KMS_LOCATION || 'global',
    process.env.KMS_KEY_RING,
    process.env.KMS_CRYPTO_KEY
  )
  return async (ciphertext: string) => {
    const result = await client.decrypt({ ciphertext, name: formattedName })
    return result[0].plaintext.toString()
  }
}
