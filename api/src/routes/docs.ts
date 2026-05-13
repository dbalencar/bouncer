import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

const router = Router();

const specPath = path.join(__dirname, '../../openapi.yaml');

// Read on each request rather than caching at module load. The dev
// server (ts-node-dev) only watches .ts files, so caching the YAML
// makes spec edits invisible until restart. The file is small (~30KB)
// and these endpoints are rarely hit; per-request read keeps dev
// ergonomics simple.
const readSpecYaml = () => fs.readFileSync(specPath, 'utf8');

router.get('/openapi.yaml', (_req: Request, res: Response) => {
  res.type('text/yaml').send(readSpecYaml());
});

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(yaml.load(readSpecYaml()));
});

const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bouncer API — Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>body { margin: 0 } #swagger-ui { max-width: none }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      tryItOutEnabled: true
    });
  </script>
</body>
</html>`;

router.get('/docs', (_req: Request, res: Response) => {
  res.type('html').send(swaggerHtml);
});

export default router;
