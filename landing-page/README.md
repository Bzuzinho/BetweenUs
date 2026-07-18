# BetweenUs — Landing Page

Landing page autónoma, criada em HTML, CSS e JavaScript puro. Não depende do frontend React da aplicação e pode ser publicada por upload direto em qualquer alojamento estático.

## Estrutura

- `index.html` — conteúdo, SEO e estrutura da página
- `styles.css` — design responsivo, animações e mockups da aplicação
- `script.js` — menu móvel, animações e formulário da lista de espera
- `assets/` — favicon e imagem Open Graph

## Testar localmente

Pode abrir diretamente o ficheiro `index.html` no navegador. Para testar com um servidor local:

```bash
cd landing-page
python3 -m http.server 8080
```

Depois aceder a `http://localhost:8080`.

## Publicar por FTP/cPanel

1. Abrir a pasta `landing-page`.
2. Enviar **o conteúdo da pasta**, não a pasta exterior, para `public_html` ou para a raiz do subdomínio.
3. Confirmar que o servidor apresenta `index.html` como documento inicial.
4. Ativar HTTPS.

## Publicar em Railway, Netlify ou Cloudflare Pages

Configurar a raiz do serviço para `landing-page`. Não existe comando de build. O diretório de publicação é a própria pasta `landing-page`.

## Lista de espera

O formulário atual valida o email e guarda-o apenas no `localStorage` do navegador, para permitir demonstrar o fluxo sem backend.

Antes da publicação pública deve substituir o tratamento em `script.js` por uma chamada ao backend, por exemplo:

```js
await fetch('https://api.seudominio.com/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: email.value })
});
```

Nunca devem ser colocadas chaves privadas, tokens ou credenciais no JavaScript da landing page.

## Pontos a personalizar antes do lançamento

- domínio e email de contacto;
- links das redes sociais;
- URLs finais dos documentos legais;
- endpoint real da lista de espera;
- números da secção de comunidade, quando existirem dados confirmados;
- texto legal e cookies após revisão jurídica.
