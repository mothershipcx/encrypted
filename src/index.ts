import * as _ from 'lodash'
import { getDecryptor } from './kms'

export async function decrypt() {
  // Get the list of key-value pairs from environment variables.
  type Pair = [string, string]
  let pairs: Pair[] = _.toPairs(process.env)

  // Find those which marked as encrypted and decrypt them.
  // NOTE original variable will be removed.
  const suffix = '_ENCRYPTED'
  let decryptText: (cipertext: string) => Promise<string>
  pairs = await Promise.all(
    pairs.map(
      ([key, value]): Promise<Pair> => {
        if (key.endsWith(suffix)) {
          if (!decryptText) {
            decryptText = getDecryptor()
          }
          return new Promise((resolve, reject) => {
            decryptText(value)
              .then((decryptedValue: string) =>
                resolve([
                  key.substring(0, key.length - suffix.length),
                  decryptedValue
                ])
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
  return _.fromPairs(pairs)
}
