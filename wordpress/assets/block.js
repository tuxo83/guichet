/* The block "Guichet": pick a guichet, its height, its title bar. Plain JavaScript (no build step):
 * the page is drawn by the server (render_callback), so the post keeps only these settings. */
( function ( blocks, element, components, blockEditor, ServerSideRender ) {
	const el = element.createElement;
	const data = window.guichetBlock || { guichets: [], words: {} };
	const w = data.words;
	blocks.registerBlockType( 'guichet/chat', {
		apiVersion: 3,
		title: 'Guichet',
		description: w.about,
		icon: 'format-chat',
		category: 'widgets',
		attributes: {
			id: { type: 'string', default: '' },
			height: { type: 'number', default: 520 },
			title: { type: 'boolean', default: true },
		},
		edit: function ( props ) {
			const a = props.attributes;
			const set = props.setAttributes;
			const options = [ { value: '', label: '—' } ].concat( data.guichets );
			const pick = el( components.SelectControl, { label: w.pick, value: a.id, options: options, onChange: function ( v ) { set( { id: v } ); }, __nextHasNoMarginBottom: true } );
			const side = el( blockEditor.InspectorControls, null,
				el( components.PanelBody, { title: 'Guichet' },
					pick,
					el( components.RangeControl, { label: w.height, value: a.height, min: 280, max: 1200, step: 20, onChange: function ( v ) { set( { height: v || 520 } ); } } ),
					el( components.ToggleControl, { label: w.title, checked: a.title, onChange: function ( v ) { set( { title: v } ); } } )
				)
			);
			const body = a.id
				? el( ServerSideRender, { block: 'guichet/chat', attributes: a } )
				: el( components.Placeholder, { icon: 'format-chat', label: 'Guichet', instructions: data.guichets.length ? w.about : w.none }, data.guichets.length ? pick : null );
			return el( 'div', blockEditor.useBlockProps(), side, body );
		},
		save: function () { return null; },
	} );
} )( window.wp.blocks, window.wp.element, window.wp.components, window.wp.blockEditor, window.wp.serverSideRender );
