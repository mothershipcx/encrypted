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

const base64 = (value: string) => Buffer.from(value).toString('base64')

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
    getDecryptor.cache.clear()
  })

  it('uses memoize to init kms once', () => {
    const decrypt = getDecryptor()
    expect(decrypt).toBeDefined()
    expect(getDecryptor()).toBe(decrypt)
    expect(mockKMSClient.cryptoKeyPath).toBeCalledTimes(1)
  })

  describe('Get project ID from GCP default ENV variables', () => {
    it('reads GOOGLE_CLOUD_PROJECT for App Engine', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'app-engine-project'
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'app-engine-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('prioritize KMS_PROJECT_ID over GOOGLE_CLOUD_PROJECT', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'app-engine-project'
      process.env.KMS_PROJECT_ID = 'test-project'
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('reads GCLOUD_PROJECT for Cloud Functions', () => {
      process.env.GCLOUD_PROJECT = 'cloud-functions-project'
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'cloud-functions-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('prioritize KMS_PROJECT_ID over GCLOUD_PROJECT', () => {
      process.env.GCLOUD_PROJECT = 'cloud-functions-project'
      process.env.KMS_PROJECT_ID = 'test-project'
      const wrapper = getDecryptor()
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
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'cloud-functions-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })

    it('prioritize KMS_PROJECT_ID over GCP_PROJECT', () => {
      process.env.GCP_PROJECT = 'cloud-functions-project'
      process.env.KMS_PROJECT_ID = 'test-project'
      const wrapper = getDecryptor()
      expect(wrapper).toBeDefined()
      expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
        'test-project',
        expect.any(String),
        expect.any(String),
        expect.any(String)
      )
    })
  })

  describe('Project specified with KSM_PROJECT_ID', () => {
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
      await expect(wrapper(base64('encrypted secret'))).resolves.toBe('secret')
      expect(mockKMSClient.decrypt).toHaveBeenLastCalledWith({
        ciphertext: 'encrypted secret',
        name: mockName
      })
    })

    describe('Config passed as an object', () => {
      it('proiritize `project` over KMS_PROJECT_ID env variable', () => {
        const wrapper = getDecryptor({ project: 'my-project' })
        expect(wrapper).toBeDefined()
        expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
          'my-project',
          expect.any(String),
          expect.any(String),
          expect.any(String)
        )
      })

      it('proiritize `location` over KMS_LOCATION env variable', () => {
        process.env.KMS_LOCATION = 'europe-west1'
        const wrapper = getDecryptor({ location: 'europe-west3' })
        expect(wrapper).toBeDefined()
        expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
          expect.any(String),
          'europe-west3',
          expect.any(String),
          expect.any(String)
        )
      })

      it('proiritize `ring` over KMS_KEY_RING env variable', () => {
        const wrapper = getDecryptor({ ring: 'foo-ring' })
        expect(wrapper).toBeDefined()
        expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          'foo-ring',
          expect.any(String)
        )
      })

      it('proiritize `key` over KMS_CRYPTO_KEY env variable', () => {
        const wrapper = getDecryptor({ key: 'foo-key' })
        expect(wrapper).toBeDefined()
        expect(mockKMSClient.cryptoKeyPath).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          'foo-key'
        )
      })
    })
  })
})
