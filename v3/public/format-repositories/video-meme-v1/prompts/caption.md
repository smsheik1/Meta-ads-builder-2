# Write The Caption

After choosing the template:

1. Run `npm run format:video-meme -- prompt --run=<id>`.
2. Read the generated `caption-prompt.txt`.
3. Follow that production prompt exactly.
4. Write three options.
5. In Guide Me mode, show all three and ask:

   `Which caption should I use? Say 1, 2, 3, or pick for me.`

6. In Turbo mode, pick the strongest option yourself.
7. Save only the selected option in `meme-plan.json`.
8. Add the evidence indexes that support it.

The generated prompt is the exact prompt contract used by Wiggly's live Video Meme format.

Do not call a separate LLM API. You are the writing agent.
