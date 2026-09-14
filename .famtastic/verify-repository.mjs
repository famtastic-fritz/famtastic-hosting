import { requireRepositoryContract, preflightRepository } from './site-foundation/index.js';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = requireRepositoryContract(root);
preflightRepository({ repository_path: root, site_id: manifest.site_id, remote_url: manifest.repository.url, require_clean: false });
console.log(JSON.stringify({valid:true,site_id:manifest.site_id,contract_version:manifest.contract_version}));
