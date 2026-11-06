export const REPO_URL = 'https://github.com/AdityaBirangal/Upfront'

/** Link to a file in the repo on the main branch. */
export function repoFileUrl(path: string) {
  return `${REPO_URL}/blob/main/${path}`
}
