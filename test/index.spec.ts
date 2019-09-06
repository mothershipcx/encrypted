import * as _ from 'lodash'
import { getDefaultDecryptor } from '../src/kms'
import { decrypt, decryptProcessEnv } from '../src'

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

describe('Environment utils', () => {
  beforeEach(() => {
    getDefaultDecryptor.cache.clear()
  })

  describe('Decrypt a flat ENV dictionary', () => {
    it('returns process environment variables', async () => {
      await expect(
        decrypt({
          USER: 'alice',
          FOO: 'bar'
        })
      ).resolves.toEqual({
        USER: 'alice',
        FOO: 'bar'
      })
      // Ensure lazy initialization for the decryptor
      expect(mockKMSClient.cryptoKeyPath).not.toBeCalled()
    })

    it('returns decrypted variables', async () => {
      await expect(
        decrypt({
          USER: 'alice',
          PASSWORD_ENCRYPTED: base64('encrypted password'),
          API_KEY_ENCRYPTED: base64('encrypted api key')
        })
      ).resolves.toEqual({
        USER: 'alice',
        PASSWORD: 'secret',
        API_KEY: 'secret'
      })
      // Ensure we init decryptor once
      expect(mockKMSClient.cryptoKeyPath).toBeCalledTimes(1)
    })
  })

  describe('Decrypt process.env', () => {
    let envBackup: NodeJS.ProcessEnv

    beforeAll(() => {
      envBackup = { ...process.env }
    })

    afterAll(() => {
      process.env = envBackup
    })

    it('calls decrypt with process.env', async () => {
      const TEST_DECRYPT = 'mocked env variable value'
      process.env = { ...process.env, TEST_DECRYPT }
      await expect(decryptProcessEnv()).resolves.toEqual(
        expect.objectContaining({ TEST_DECRYPT })
      )
    })
  })

  describe('Decrypt nested objects', () => {
    it('returns object as it is if nothing to decrypt', async () => {
      const config = {
        postgres: {
          user: 'alice',
          database: 'mothership'
        },
        sentry: {
          dsn: 'https://abc123@sentry.io/1234567'
        }
      }
      await expect(decrypt(config)).resolves.toEqual(config)
      // Ensure lazy initialization for the decryptor
      expect(mockKMSClient.cryptoKeyPath).not.toBeCalled()
    })

    it('returns decrypted variables', async () => {
      await expect(
        decrypt({
          postgres: {
            user: 'alice',
            passwordencrypted: base64('password')
          },
          mailgun: {
            keyencrypted: base64('api-key')
          }
        })
      ).resolves.toEqual({
        postgres: {
          user: 'alice',
          password: 'secret'
        },
        mailgun: {
          key: 'secret'
        }
      })
      // Ensure we init decryptor once
      expect(mockKMSClient.cryptoKeyPath).toBeCalledTimes(1)
    })

    it('flattens the structure if nested object contains only encrypted key', async () => {
      await expect(
        decrypt({
          postgres: {
            user: 'alice',
            password: {
              encrypted: base64('password')
            }
          }
        })
      ).resolves.toEqual({
        postgres: {
          user: 'alice',
          password: 'secret'
        }
      })
      // Ensure we init decryptor once
      expect(mockKMSClient.cryptoKeyPath).toBeCalledTimes(1)
    })
  })
})
