import { IconSettings } from '@tabler/icons-react';
import styles from './logseq.module.scss';
import Browser from 'webextension-polyfill';
import { LogseqBlock } from './LogseqBlock';
import LogseqPageLink from './LogseqPage';
import logo from '../assets/img/logo.png';
import { LogseqPageIdenity, LogseqBlockType } from '@/types/logseqBlock';
import { Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon, Box, flexbox, } from '@chakra-ui/react'


const LogseqCopilot = ({ graph, pages, blocks, searchQuery }: { graph: string, pages: LogseqPageIdenity[], blocks: LogseqBlockType[], searchQuery: string }) => {
  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const groupedBlocks = blocks.reduce((groups: Record<string, Record<string, LogseqBlockType[]>>, item: LogseqBlockType) => {
    const searchTypeGroup = item.blockSearchType ? groups[item.blockSearchType] : groups.default;
    const group = (searchTypeGroup[item.page.name] || []);
    group.push(item);
    searchTypeGroup[item.page.name] = group;
    return groups;
  }, { default: {} });

  console.log({ groupedBlocks, blocks }); // TODO: remove this later after testing

  const count = () => {
    return pages.length + blocks.length;
  };

  const blocksRender = () => {
    if (blocks.length === 0) {
      return <></>;
    }
    return (
      <>
        {/* <span>Blocks:</span> */}
        <div className={styles.blocks}>
          {Object.entries(groupedBlocks).map(([key, searchTypeGroupBlocks], i) => {
            // return blockGroup.map((block) => {
            const logseqPageBlocks = Object.entries(searchTypeGroupBlocks).map(([key, allBlocksinPage], i) => {
              return (
                <LogseqBlock key={key} blocksPerPage={allBlocksinPage} graph={graph} />
              )
            });
            // });

            return (
              <>
                {(Object.keys(groupedBlocks).length == 1 && Object.keys(groupedBlocks)[0] == "default") ? <></> : <p>{key}</p>}
                {logseqPageBlocks}
              </>
            )
          })}
        </div>
      </>
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
    return (
      <>
        {/* <span>Pages:</span> */}
        <div className={styles.pages}>
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
      </>
    )

  };

  if (count() === 0) {
    return (
      <span>
        Nothing here, Do some research with Logseq!{' '}
        <a href={`logseq://graph/${graph}`}>Go</a>
      </span>
    );
  }

  const hasAside = !!document.getElementById('rhs');

  return (
    <>
      <Accordion defaultIndex={[0]} allowToggle>
        <AccordionItem className={styles.accordianItem}>
          <AccordionButton _expanded={{ bg: '#002a35', color: 'white' }}
          // title={`this block is a result of ${key} - ${key == BlockSearchType.FUZZY_URL ? "searching the website domain" : "searching the webpage title"}`}
          >
            <Box className={styles.copilotCardHeader} as="span" flex='1' textAlign='left'>
              <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <img
                  height={16}
                  className={``}
                  src={logo}
                  // onClick={capture}
                  alt={'Logseq Logo'}
                />
                <span>Graph: {graph}</span>
                <span className={styles.popupGroupToolTip}
                  title={`Search Query: ${searchQuery} `}
                >
                  🔍
                </span>
              </span>
              <IconSettings onClick={goOptionPage} size={16} />
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel p={4} className={styles.accordianPanel + ' ' + hasAside ? styles.copilotBodyOverflow : ''}>
            {pagesRender()}
            {blocksRender()}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </>
  );
};

export default LogseqCopilot;
