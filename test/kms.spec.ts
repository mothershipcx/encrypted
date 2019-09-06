import { getDecryptor } from '../src/kms'

const mockName = 'gcloud/resource/path'
const mockKMSClient = {
  cryptoKeyPath: jest.fn().mockReturnValue(mockName),
  decrypt: jest.fn().mockResolvedValue([{ plaintext: Buffer.from('secret') }])
}
jest.mock('@google-cloud/kms', () => ({
  v1: {
    KeyManagementServiceClient: jest.fn(() => mockKMSClient)
  }
}))

describe('KMS decrypt wrapper', () => {
  let envBackup: NodeJS.ProcessEnv

  beforeAll(() => {
    envBackup = process.env
  })

  afterAll(() => {
    process.env = envBackup
  })

  beforeEach(() => {
    process.env = {
      KMS_KEY_RING: 'test-keyring',
      KMS_CRYPTO_KEY: 'test-key'
    }
  })

  describe('Get project from GCP default ENV variables', () => {
    it('reads GOOGLE_CLOUD_PROJECT for App Engine', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'app-engine-project'
      let wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'app-engine-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )

      // It's possible to override it with a custom value
      process.env.KMS_PROJECT_ID = 'test-project'
      wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('reads GCLOUD_PROJECT for Cloud Functions', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'cloud-functions-project'
      let wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'cloud-functions-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )

      // It's possible to override it with a custom value
      process.env.KMS_PROJECT_ID = 'test-project'
      wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('reads GCP_PROJECT for Cloud Functions', () => {
      process.env.GCP_PROJECT = 'cloud-functions-project'
      let wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'cloud-functions-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )

      // It's possible to override it with a custom value
      process.env.KMS_PROJECT_ID = 'test-project'
      wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe('Project specified explicitely', () => {
    beforeEach(() => {
      process.env.KMS_PROJECT_ID = 'test-project'
    })

    it('uses ENV for configuretion and global keyring location by default', () => {
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        'global',
        'test-keyring',
        'test-key'
      )
    })

    it('can use a specific keyring location', () => {
      process.env.KMS_LOCATION = 'test-location'
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        'test-location',
        'test-keyring',
        'test-key'
      )
    })

    it('calls wrapped decrypt function', async () => {
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      await expect(
        wrapper(Buffer.from('encrypted secret').toString('base64'))
      ).resolves.toBe('secret')
      expect(mockKMSClient.decrypt).toHaveBeenLastCalledWith({
        ciphertext: 'encrypted secret',
        name: mockName
      })
    })
  })
})
