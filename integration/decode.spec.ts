import * as kms from '@google-cloud/kms'
import { getDecryptor } from '../src/kms'

function getProjectId() {
  const e = process.env
  const id =
    e.PROJECT_ID || e.GOOGLE_CLOUD_PROJECT || e.GCLOUD_PROJECT || e.GCP_PROJECT
  if (id) return id

  const credsFile = e.GOOGLE_APPLICATION_CREDENTIALS
  if (credsFile && credsFile.endsWith('.json')) {
    return require(credsFile).project_id
  }
}

describe('Cloud KMS integration', () => {
  const client = new kms.KeyManagementServiceClient()
  const conf = {
    project: getProjectId(),
    location: 'global',
    ring: 'integration-test',
    key: 'default'
  }

  async function encrypt(plaintext: string): Promise<Buffer> {
    const name = client.cryptoKeyPath(
      conf.project,
      conf.location,
      conf.ring,
      conf.key
    )
    plaintext = Buffer.from(plaintext).toString('base64')
    const [{ ciphertext }] = await client.encrypt({ name, plaintext })
    return ciphertext
  }

  it('decodes base64 encoded cyphertext', async () => {
    const ciphertext = (await encrypt('foo')).toString('base64')
    const decrypt = getDecryptor(conf)
    await expect(decrypt(ciphertext)).resolves.toBe('foo')
  })
})
