import { decrypt } from '../src'
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

describe('Environment utils', () => {
  let envBackup: NodeJS.ProcessEnv

  beforeAll(() => {
    envBackup = process.env
  })

  beforeEach(() => {
    process.env = {}
    mockKMSClient.cryptoKeyPath.mockClear()
  })

  afterAll(() => {
    process.env = envBackup
  })

  it('returns process environment variables', () => {
    process.env.USER = 'alice'
    process.env.FOO = 'bar'
    expect(decrypt()).resolves.toEqual({
      USER: 'alice',
      FOO: 'bar'
    })
    // Ensure lazy initialization for the decryptor
    expect(mockKMSClient.cryptoKeyPath).not.toBeCalled()
  })

  it('returns decrypted variables', () => {
    process.env.USER = 'alice'
    process.env.PASSWORD_ENCRYPTED = 'encrypted password'
    process.env.API_KEY_ENCRYPTED = 'encrypted api key'
    expect(decrypt()).resolves.toEqual({
      USER: 'alice',
      PASSWORD: 'secret',
      API_KEY: 'secret'
    })
    // Ensure we init decryptor once
    expect(mockKMSClient.cryptoKeyPath).toBeCalledTimes(1)
  })
})
