// Entry point for the Aiee Express server.
// TODO: import app, load env config, connect Redis, and listen on PORT.

import { createApp } from "./app.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`✓ Aiee server running at http://127.0.0.1:${PORT}`);
});
