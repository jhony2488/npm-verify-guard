import { mkdir, writeFile as fsWriteFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

export async function createTempProject(prefix = 'npm-verify-test') {
  const root = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(root, { recursive: true });

  async function writeRelative(relativePath, content) {
    const fullPath = join(root, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await fsWriteFile(fullPath, content, 'utf8');
  }

  return {
    root,
    path: (...segments) => join(root, ...segments),
    async writeJson(relativePath, data) {
      await writeRelative(relativePath, `${JSON.stringify(data, null, 2)}\n`);
    },
    async writeFile(relativePath, content) {
      await writeRelative(relativePath, content);
    },
  };
}

export const defaultProjectConfig = {
  allowPackages: [],
  ignorePaths: [],
  heuristics: { maxFileSizeKb: 512 },
  ml: { enabled: true },
};
