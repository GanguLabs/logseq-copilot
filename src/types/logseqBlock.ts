export type LogseqPageIdenity = {
  name: string;
  id: number;
  uuid: string;
  originalName?: string;
};

export type LogseqBlockType = {
  uuid: string;
  html: string;
  page: LogseqPageIdenity;
  content: string;
  format: string;
  id: number;
  parent:{id: number};
  marker: string;
  priority: string;
  blockSearchType?: BlockSearchType;
  searchQuery?: string;
};

export enum BlockSearchType {
  FUZZY_URL = 'fuzzy_url',
  WEBPAGE_TITLE = 'webpage_title',
}

export type LogseqPageContentType = {
  uuid: string;
  content: string;
  page: LogseqPageIdenity;
};

export type LogseqSearchResult = {
  blocks: LogseqBlockType[];
  pages: LogseqPageIdenity[];
  // pageContents: LogseqPageContentType[];
  graph: string;
};
