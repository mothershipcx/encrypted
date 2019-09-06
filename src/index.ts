import * as _ from 'lodash'
import { getDecryptor, IKMSConfig } from './kms'

type Pair = [string, any]
type Config = _.Dictionary<any>

export async function decrypt(
  config: Config,
  kms?: IKMSConfig
): Promise<Config> {
  // Find those which marked as encrypted and decrypt them.
  // NOTE original variable will be removed.
  const suffix = /_?encrypted$/i
  const decryptedPairs: ArrayLike<Pair> = await Promise.all(
    _.toPairs(config).map(
      ([key, value]): Promise<Pair> => {
        // Recursively call `decrypt` for nested configs
        if (typeof value === 'object') {
          return new Promise((resolve, reject) => {
            decrypt(value, kms)
              .then((decryptedChild: Config) => {
                // Flatten nested config if it has `encrypted` key
                const decryptedValue: Config | string = _.isEqual(
                  _.keys(value),
                  ['encrypted']
                )
                  ? _.values(decryptedChild).pop()
                  : decryptedChild
                resolve([key, decryptedValue])
              })
              .catch(reject)
          })
        }
        if (typeof value === 'string' && suffix.test(key)) {
          // Lazy initialization
          const decryptText = getDecryptor(kms)
          return new Promise((resolve, reject) => {
            decryptText(value)
              .then((decryptedValue: string) =>
                resolve([key.replace(suffix, ''), decryptedValue])
              )
              .catch(reject)
          })
        }
        const original: Pair = [key, value]
        return Promise.resolve(original)
      }
    )
  )

  // Compose an object with decrypted environment
  return _.fromPairs(decryptedPairs)
}

export async function decryptProcessEnv(): Promise<Config> {
  return decrypt(process.env)
}
