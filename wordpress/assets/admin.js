/* Settings › Guichet: tabs that show one section at a time (all are there without JavaScript),
 * Copy buttons, limit rows added and removed, confirmations, the list's search box. */
( function () {
	const t = window.guichetAdmin || {};
	const tabs = document.querySelectorAll( '.guichet-tabs .nav-tab' );
	const show = ( id ) => {
		const known = [ ...tabs ].some( ( a ) => a.hash === `#${ id }` );
		if ( ! known ) id = tabs[ 0 ]?.hash.slice( 1 );
		for ( const a of tabs ) a.classList.toggle( 'nav-tab-active', a.hash === `#${ id }` );
		for ( const s of document.querySelectorAll( '.guichet-main > .guichet-section' ) ) s.hidden = s.id !== id;
	};
	if ( tabs.length ) {
		document.body.classList.add( 'guichet-tabbed' );
		for ( const a of tabs ) a.addEventListener( 'click', ( e ) => { e.preventDefault(); history.replaceState( null, '', a.hash ); show( a.hash.slice( 1 ) ); } );
		show( location.hash.slice( 1 ) );
	}
	document.addEventListener( 'click', async ( e ) => {
		const b = e.target.closest( '.guichet-copy' );
		if ( b ) {
			try { await navigator.clipboard.writeText( b.dataset.copy ); const was = b.textContent; b.textContent = t.copied; setTimeout( () => { b.textContent = was; }, 1500 ); } catch { /* the text stays selectable */ }
			return;
		}
		if ( e.target.closest( '.guichet-delete' ) && ! window.confirm( t.sure ) ) e.preventDefault();
		if ( e.target.closest( '.guichet-revoke' ) && ! window.confirm( t.revoke ) ) e.preventDefault();
		if ( e.target.closest( '.guichet-remove-limit' ) ) e.target.closest( 'tr' ).remove();
		if ( e.target.closest( '.guichet-add-limit' ) ) {
			const body = document.querySelector( '.guichet-limits tbody' );
			const row = document.getElementById( 'guichet-limit-row' ).innerHTML.replaceAll( '__i__', String( Date.now() ) );
			body.insertAdjacentHTML( 'beforeend', row );
		}
	} );
	const filter = document.querySelector( '.guichet-filter' );
	filter?.addEventListener( 'input', () => {
		const q = filter.value.trim().toLowerCase();
		for ( const tr of document.querySelectorAll( '.guichet-list tbody tr[data-search]' ) ) tr.hidden = q !== '' && ! tr.dataset.search.includes( q );
	} );
} )();
