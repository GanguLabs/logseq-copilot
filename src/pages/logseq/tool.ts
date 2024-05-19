import { LogseqBlockType } from '../../types/logseqBlock';

import { marked } from 'marked';

export const cleanBlock = (block: LogseqBlockType): string => {
  let result = block.content;
  if (!result) {
    return '';
  }
  if (block.marker) {
    result = result.replace(block.marker, '');
  }

  if (block.priority) {
    result = result.replace(`[#${block.priority}]`, '');
  }

  const propertiesRegex = /\n(.*?)::\s?(.*?)(?=(?:\n|\Z|$))/gm; // /^[\w.-]+::.*?$/gm - old regex  which works
  // this propertiesRegex split the properties into individual groups
  // const propertiesRegex = new RegExp('\\n(.*?)::\\s?(.*?)(?=(?:\\n|\\Z|$))', 'gm');

  return result
    .replaceAll(/!\[.*?\]\(\.\.\/assets.*?\)/gim, '')
    .replaceAll(propertiesRegex, '') // clean properties
    .replaceAll(/{{renderer .*?}}/gim, '') // clean renderer
    .replaceAll(/^deadline: <.*?>$/gim, '') // clean deadline
    .replaceAll(/^scheduled: <.*?>$/gim, '') // clean schedule
    .replaceAll(/^:logbook:[\S\s]*?:end:$/gim, '') // clean logbook
    .replaceAll(/^:LOGBOOK:[\S\s]*?:END:$/gim, '') // clean logbook
    .replaceAll(/\$pfts_2lqh>\$(.*?)\$<pfts_2lqh\$/gim, '<em>$1</em>') // clean highlight
    .replaceAll(/{{video .*?}}/gm, '')
    .replaceAll(/^\s*?-\s*?$/gim, '')
    .trim();
};

export function isBlockIgnore(block: LogseqBlockType){
  // ignore query blocks
  if (block.content.includes('#+BEGIN_QUERY') || block.content.includes('#+END_QUERY')) {
    return true;
  }

  return false;
}

const highlightTokens = (query: string) => {
  const re = new RegExp(`^(?!<mark>)${query}(?!<\/mark>)`, 'g');
  return (token) => {
    if (
      token.type !== logseqTokenType.code &&
      token.type !== logseqTokenType.codespan &&
      token.type !== logseqTokenType.logseqPageRef &&
      token.type !== logseqTokenType.logseqBlockRef &&
      token.text
    ) {
      token.text = query
        ? token.text.replaceAll(re, '<mark>' + query + '</mark>')
        : token.text;
    }
  };
};

const logseqLinkExt = (graph: string, query?: string) => {
  return {
    name: 'logseqLink',
    level: 'inline',
    tokenizer: function (src: string) {
      const pageRefRegex = src.match(/^#?\[\[(.*?)\]\]/); // regex: \[\[(.*?)\]\]
      const blockRefRegex = src.match(/^#?\[(.*?)\]\(\(\((.*?)\)\)\)/); // regex: \[(.*?)\]\(\(\((.*?)\)\)\)
      if (pageRefRegex) {
        return {
          type: 'logseqLink',
          logseqDataType: logseqTokenType.logseqPageRef,
          raw: pageRefRegex[0],
          text: pageRefRegex[1],
          href: pageRefRegex[1].trim(),
          tokens: [],
        };
      }
      if(blockRefRegex) {
        return {
          type: 'logseqLink',
          logseqDataType: logseqTokenType.logseqBlockRef,
          raw: blockRefRegex[0],
          text: blockRefRegex[1],
          href: blockRefRegex[2].trim(),
          tokens: [],
        };
      }
      return false;
    },
    renderer: function (token) {
      const { text, href, logseqDataType } = token;

      const fillText = query
        ? text.replaceAll(query, '<mark>' + query + '</mark>')
        : text;

      const pageRefToHref = `<a class="logseq-page-link" href="logseq://graph/${graph}?page=${href}"><span class="tie tie-page"></span>${fillText}</a>`;
      const blockRefToHref = `<a class="logseq-block-link" href="logseq://graph/${graph}?block-id=${href}"><span class="tie tie-block"></span>${fillText}</a>`;

      const hrefToReturn = logseqDataType === logseqTokenType.logseqPageRef ? pageRefToHref : blockRefToHref;
      

      return hrefToReturn;
    },
  };
};

export const renderBlock = (
  block: LogseqBlockType,
  graphName: string,
  query?: string,
) => {
  const cleanContent = cleanBlock(block);
  marked.use({
    gfm: true,
    tables: true,
    walkTokens: query ? highlightTokens(query) : undefined,
    extensions: [logseqLinkExt(graphName, query)],
  });
  const html = marked.parse(cleanContent).trim();

  block.html = html;
  return block;
};

const enum logseqTokenType {
  logseqBlockRef = 'logseqBlockRef',
  logseqPageRef = 'logseqPageRef',
  code = 'code',
  codespan = 'codespan',
}
