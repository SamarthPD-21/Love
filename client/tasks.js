const fs = require('fs');

let content = fs.readFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', 'utf8');

// Task 4.3: Add "Partner" to toasts
content = content.replace(/showActionToast\(`Server switched to \$\{data\.server\}`,\s*"🖥️"\);/g, 'showActionToast(`Partner switched server to ${data.server}`, "🖥️");');
content = content.replace(/showActionToast\("Stream source updated",\s*"🎬"\);/g, 'showActionToast("Partner updated stream source", "🎬");');

// Task 4.6: STREAM_SOURCES constant for <select>
const selectRegex = /<select\s*value=\{activeSource\}[\s\S]*?<\/select>/;
const newSelect = `<select
                    value={activeSource}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="cinema-select"
                  >
                    {STREAM_SOURCES.map(s => (
                      <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
                    ))}
                  </select>`;

content = content.replace(selectRegex, newSelect);

fs.writeFileSync('c:/Users/Samarth Deshpande/Desktop/Sam_N/Love/client/app/cinema/page.tsx', content, 'utf8');
