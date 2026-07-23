const fs = require('fs');

let content = fs.readFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', 'utf8');

const importRegex = /import \{[\s\S]*?\} from "lucide-react";[\s\S]*?import \{ cn, getRelationshipId \} from "@\/lib\/utils";/;

if (!content.includes('STREAM_SOURCES')) {
  content = content.replace(importRegex, (match) => {
    return match + `\n\nconst STREAM_SOURCES = [
  { key: 'cineby', label: 'Cineby.at', emoji: '🌟' },
  { key: 'default', label: '1HD.to', emoji: '🎬' },
  { key: 'miruro', label: 'Miruro (Anime)', emoji: '🌸' },
  { key: 'bflix', label: 'BFlix', emoji: '🅱️' },
  { key: 'vidsrc_to', label: 'VidSrc.to', emoji: '⚡' },
  { key: 'vidsrc_me', label: 'VidSrc.me', emoji: '⚡' },
  { key: 'vidsrcme_ru', label: 'VidSrcMe.ru', emoji: '🇷🇺' },
  { key: 'vidsrc_xyz', label: 'VidSrc.xyz', emoji: '⚡' },
  { key: 'two_embed', label: '2Embed', emoji: '🎞️' },
  { key: 'multiembed', label: 'MultiEmbed', emoji: '🔗' },
  { key: 'embedsu', label: 'Embed.su', emoji: '🎥' },
  { key: 'autoembed', label: 'AutoEmbed', emoji: '🤖' },
  { key: 'smashystream', label: 'SmashyStream', emoji: '💥' },
] as const;`;
  });
}

fs.writeFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', content, 'utf8');
