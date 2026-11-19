'use client';

import { useRef, useState } from 'react';

const paths = {
  home: 'm3 11 9-8 9 8M5 10v11h5v-6h4v6h5V10',
  browse: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  bag: 'M5 8h14l1 13H4L5 8Zm4 1V6a3 3 0 0 1 6 0v3',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2',
  profile: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 19a6 6 0 0 1 12 0',
  menu: 'M4 6h16M9 12h11M4 18h16',
  close: 'm6 6 12 12M18 6 6 18',
};

export function Icon({ name }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

export default function StoreHeader({ count, customer, homeHref, bagHref, accountButton }) {
  const dialog = useRef(null);
  const [panel, setPanel] = useState('menu');
  const [opened, setOpened] = useState(false);

  function open(next) {
    setPanel(next);
    dialog.current.showModal();
    setOpened(true);
  }

  return <>
    <header className="store-header" id="home">
      <button className="header-icon header-menu" type="button" aria-haspopup="dialog"
          aria-controls="store-sidebar" aria-expanded={opened && panel === 'menu'}
          aria-label="Open sidebar" onClick={() => open('menu')}><Icon name="menu" /></button>
      <a href={homeHref} className="brand"><img src="/flickit-logo.png" alt="Flickit" width="2172" height="724" /></a>
      <div className="header-actions">
        <a href={bagHref} className="header-icon header-bag" aria-label={`Shopping bag, ${count} items`}>
          <Icon name="bag" />{count > 0 && <span aria-hidden="true">{count}</span>}
        </a>
        <button ref={accountButton} className="header-icon" type="button" aria-haspopup="dialog"
          aria-label={customer ? 'Open profile' : 'Open guest account'}
          onClick={() => open('account')}><Icon name={customer ? 'profile' : 'user'} /></button>
      </div>
    </header>
    <dialog ref={dialog} id="store-sidebar" className="store-sidebar" aria-labelledby="sidebar-title"
      onClose={() => setOpened(false)}
      onClick={event => { if (event.target === event.currentTarget) dialog.current.close(); }}>
      <div className="sidebar-content">
        <div className="row">
          <h2 id="sidebar-title">{panel === 'menu' ? 'Menu' : customer ? 'Your profile' : 'Guest account'}</h2>
          <form method="dialog"><button className="header-icon" aria-label="Close sidebar">
            <Icon name="close" />
          </button></form>
        </div>
        {panel === 'menu' ? <nav aria-label="Sidebar navigation">
          <a href={homeHref} onClick={() => dialog.current.close()}>Home</a>
          <a href={`${homeHref}#browse`} onClick={() => dialog.current.close()}>Browse groceries</a>
          <a href={bagHref} onClick={() => dialog.current.close()}>Shopping bag</a>
          <button type="button" onClick={() => setPanel('account')}>{customer ? 'Your profile' : 'Guest account'}</button>
        </nav> : customer ? <p>{customer.name}</p> :
          <p>Customer sign-in is currently unavailable.</p>}
      </div>
    </dialog>
  </>;
}
