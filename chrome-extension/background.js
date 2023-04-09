function showBadge(text, color) {
  chrome.action.setBadgeBackgroundColor({ color: color });
  chrome.action.setBadgeText({ text: text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 3000);
}

function writeToClipboard(markdown) {
  const el = document.createElement('textarea');
  el.value = markdown;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ['turndown.umd.js'],
    },
    () => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          function: () => {
            const title = document.querySelector('title').textContent;
            const titleMarkdown = (title) ? '# '+title+'\n\n' : '';

            // class : items-start
            const items = document.querySelector('main').querySelectorAll('.items-start');
            const turndownService = new TurndownService({
              codeBlockStyle: 'fenced',
              headingStyle: 'atx',
              bulletListMarker: '-'
            });
            turndownService.addRule('codeBlock', {
              filter: 'pre',
              replacement: function (content, node) {
                const lang = node.querySelector('.rounded-md div span');
                const code = node.querySelector('code');
                return '```' + (lang ? lang.innerText : '') + '\n' + (code ? code.innerText : '') + '```\n';
              }
            });

            turndownService.addRule('tables', {
              filter: ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'],
              replacement: function (content, node) {
                if (node.tagName === 'TABLE') {
                  return '\n\n' + content + '\n\n';
                } else if (node.tagName === 'THEAD' || node.tagName === 'TBODY' || node.tagName === 'TFOOT') {
                  return content + '|\n';
                } else if (node.tagName === 'TR') {
                  return content + (node.nextElementSibling ? '|\n' : '');
                } else if (node.tagName === 'TH' || node.tagName === 'TD') {
                  const colspan = node.getAttribute('colspan') || 1;
                  const separator = '|';
                  let cellContent = node.innerHTML
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/^\s+|\s+$/g, '');
                  cellContent = turndownService.turndown(cellContent);
                  const cells = [];
                  for (let i = 0; i < colspan; i++) {
                    cells.push(cellContent);
                  }
                  return separator + cells.join(separator);
                }
              }
            });
            // Add a rule for generating table header row separators
            turndownService.addRule('tableHeaderSeparator', {
              filter: function (node) {
                return (
                  node.tagName === 'THEAD' &&
                  node.parentNode.tagName === 'TABLE'
                );
              },
              replacement: function (content, node) {
                const row = node.querySelector('tr');
                const ths = Array.from(row.querySelectorAll('th'));
                const headerSeparator = ths.map(() => '| --- ').join('');
                return content + '\n' + headerSeparator + '|\n';
              }
            });
            var mds = [];
            items.forEach((item) => {
              const editButtons = item.parentNode?.parentNode?.querySelectorAll('.self-end button');
              if (editButtons.length == 1) {
                const text = item.innerText ?? '';
                mds.push('## 🤔 User\n' + (text.length > 0 && text[0] == '\n' ? '' : '\n') + text);
              } else {
                const html = item.outerHTML ?? '';
                const markdown = turndownService.turndown(html);
                mds.push('## 🤖 Assistant\n\n' + markdown);
              }
            });
            const markdown = titleMarkdown + mds.join('\n\n---\n');
            return markdown;
          },
        },
        (results) => {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            showBadge('Error', '#800000');
          } else {
            const markdown = results[0].result; // 結果を取得します。
            chrome.scripting.executeScript(
              {
                target: { tabId: tab.id },
                function: writeToClipboard,
                args: [markdown],
              },
              () => {
                if (chrome.runtime.lastError) {
                  console.error(chrome.runtime.lastError);
                  showBadge('Error', '#800000');
                } else {
                  showBadge('Copied', '#008000');
                }
              }
            );
          }
        }
      );
    }
  );
});