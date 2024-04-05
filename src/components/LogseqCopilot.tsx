import { IconSettings } from '@tabler/icons-react';
import styles from './logseq.module.scss';
import Browser from 'webextension-polyfill';
import { LogseqBlock } from './LogseqBlock';
import LogseqPageLink from './LogseqPage';
import { LogseqPageIdenity, LogseqBlockType } from '@/types/logseqBlock';


const LogseqCopilot = ({ graph, pages, blocks }:{graph: string, pages: LogseqPageIdenity[] , blocks: LogseqBlockType[]}) => {
  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const groupedBlocks = blocks.reduce((groups: Record<string, Record<string,LogseqBlockType[]>>, item: LogseqBlockType) => {
    const searchTypeGroup = item.blockSearchType ? groups[item.blockSearchType] : groups.default ;
    const group = (searchTypeGroup[item.page.name] || []);
    group.push(item);
    searchTypeGroup[item.page.name] = group;
    return groups;
  }, {default: {}});

  console.log({groupedBlocks, blocks})

  const count = () => {
    return pages.length + blocks.length;
  };

  const blocksRender = () => {
    if (blocks.length === 0) {
      return <></>;
    }
    return (
      <div className={styles.blocks}>
        {Object.entries(groupedBlocks).map(([key, searchTypeGroupBlocks], i) => {
          // return blockGroup.map((block) => {
            const logseqPageBlocks = Object.entries(searchTypeGroupBlocks).map(([key, allBlocksinPage], i) => {
            return (
            <LogseqBlock key={key} blocks={allBlocksinPage} graph={graph} />
            )});
          // });

          return(
            <>
              {(Object.keys(groupedBlocks).length == 1 && Object.keys(groupedBlocks)[0] == "default") ? <></> : <p>{key}</p>} 
              {logseqPageBlocks}
            </>
          )})}
      </div>
    );

    // {Object.entries(groupedBlocks).map(([key, searchTypeGroupBlocks], i) => {
    //   return(
    //     <p>
    //       {Object.keys(groupedBlocks).length === 1 && "Default"} 
    //     <p/>;
    //     {Object.entries(searchTypeGroupBlocks).map(([key, blocks], i) => {
    //     // return blockGroup.map((block) => {
    //       return <LogseqBlock key={key} blocks={blocks} graph={graph} />;
    //     // });
    //     }
    //   )
    // })}
  };

  const pagesRender = () => {
    if (pages.length === 0) {
      return <></>;
    }
    return <div className={styles.pages}>
      {pages.slice(0, 9).map((page) => {
        if (!page) return <></>;
        return (
          <div className={styles.page}>
            <LogseqPageLink
              key={page.name}
              graph={graph}
              page={page}
            ></LogseqPageLink>
          </div>
        );
      })}
    </div>

  };

  if (count() === 0) {
    return (
      <span>
        Nothing here, Do some research with Logseq!{' '}
        <a href={`logseq://graph/${graph}`}>Go</a>
      </span>
    );
  }

  return (
    <>
      <div className={styles.copilotCardHeader}>
        <span>Graph: {graph}</span>
        <IconSettings onClick={goOptionPage} size={16} />
      </div>
      {pagesRender()}
      {blocksRender()}
    </>
  );
};

export default LogseqCopilot;
