<?php
/**
 * On the site: the shortcode [guichet id="…"] and the block "Guichet", both drawn here (the block
 * is dynamic: no build step, nothing saved in the post but its id).
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

final class Guichet_Front {

	public static function init(): void {
		add_shortcode( 'guichet', array( self::class, 'shortcode' ) );
		wp_register_style( 'guichet-parley', GUICHET_URL . 'assets/parley/parley-ui.css', array(), GUICHET_VERSION );
		wp_register_style( 'guichet', GUICHET_URL . 'assets/guichet.css', array( 'guichet-parley' ), GUICHET_VERSION );
		wp_register_script_module( 'guichet-chat', GUICHET_URL . 'assets/guichet-chat.js', array(), GUICHET_VERSION );
		wp_register_script( 'guichet-block', GUICHET_URL . 'assets/block.js', array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render' ), GUICHET_VERSION, true );
		register_block_type(
			'guichet/chat',
			array(
				'api_version'     => 3,
				'title'           => 'Guichet',
				'category'        => 'widgets',
				'icon'            => 'format-chat',
				'editor_script'   => 'guichet-block',
				/* So the editor's preview has the frame too (the chat itself runs on the site only). */
				'style'           => 'guichet',
				'attributes'      => array(
					'id'     => array( 'type' => 'string', 'default' => '' ),
					'height' => array( 'type' => 'number', 'default' => 520 ),
					'title'  => array( 'type' => 'boolean', 'default' => true ),
				),
				'render_callback' => static fn ( $a ) => self::render( (string) ( $a['id'] ?? '' ), (int) ( $a['height'] ?? 520 ), ! empty( $a['title'] ) ),
			)
		);
		add_action( 'enqueue_block_editor_assets', array( self::class, 'block_data' ) );
	}

	/** The block's list of guichets, given to its editor script. */
	public static function block_data(): void {
		$list = array();
		foreach ( Guichet_Store::all() as $id => $g ) {
			$list[] = array(
				'value' => $id,
				'label' => '' !== ( $g['name'] ?? '' ) ? $g['name'] : $id,
			);
		}
		$data = array(
			'guichets' => $list,
			'words'    => array(
				'pick'   => __( 'Choose a guichet', 'guichet' ),
				'none'   => __( 'No guichet yet: add one in Settings › Guichet.', 'guichet' ),
				'height' => __( 'Height (pixels)', 'guichet' ),
				'title'  => __( 'Show the title bar', 'guichet' ),
				'about'  => __( 'The chat of a guichet, as visitors see it.', 'guichet' ),
			),
		);
		wp_add_inline_script( 'guichet-block', 'window.guichetBlock = ' . wp_json_encode( $data ) . ';', 'before' );
	}

	/** [guichet id="help" hauteur="520" titre="non"] (also height= and title=). */
	public static function shortcode( $atts ): string {
		$a = shortcode_atts(
			array(
				'id'      => '',
				'hauteur' => '',
				'height'  => '',
				'titre'   => '',
				'title'   => '',
			),
			$atts,
			'guichet'
		);
		$height = (int) ( '' !== $a['hauteur'] ? $a['hauteur'] : ( '' !== $a['height'] ? $a['height'] : 520 ) );
		$title  = strtolower( '' !== $a['titre'] ? $a['titre'] : $a['title'] );
		return self::render( sanitize_key( $a['id'] ), $height, ! in_array( $title, array( 'non', 'no', '0', 'false' ), true ) );
	}

	public static function render( string $id, int $height, bool $title ): string {
		$g = '' !== $id ? Guichet_Store::get( $id ) : null;
		if ( ! $g ) {
			/* Said to whoever can fix it; nothing for visitors. */
			return current_user_can( 'manage_options' )
				/* translators: %s: the guichet id given to the shortcode or block */
				? '<p class="guichet-missing">' . esc_html( sprintf( __( 'Guichet: no guichet "%s".', 'guichet' ), $id ) ) . '</p>'
				: '';
		}
		$access = Guichet_Plugin::access( $g );
		$name   = '' !== $g['name'] ? $g['name'] : $id;
		if ( true !== $access ) {
			if ( 'hide' === $g['others'] ) {
				return '';
			}
			wp_enqueue_style( 'guichet' );
			$text = 'login' === $access
				? sprintf( '<a href="%s">%s</a>', esc_url( wp_login_url( get_permalink() ? get_permalink() : home_url() ) ), esc_html__( 'Sign in to ask a question.', 'guichet' ) )
				: esc_html__( 'This guichet is not open to your account.', 'guichet' );
			return '<div class="guichet guichet-refused">' . self::head( $g, $name, null ) . '<p class="guichet-note">' . $text . '</p></div>';
		}
		wp_enqueue_style( 'guichet' );
		wp_enqueue_script_module( 'guichet-chat' );
		$locale = determine_locale();
		$config = array(
			'rest'   => Guichet_Plugin::engine_url( $id ),
			'nonce'  => is_user_logged_in() ? wp_create_nonce( 'wp_rest' ) : '',
			'parley' => GUICHET_URL . 'assets/parley',
			'words'  => str_starts_with( $locale, 'fr' ) ? 'fr' : 'en',
			'locale' => str_replace( '_', '-', $locale ),
			'name'   => $name,
			'max'    => (int) $g['maxQuestion'],
			't'      => self::texts( $g, $name ),
		);
		$open = Guichet_Plugin::relay()->status( $id )['open'];
		return sprintf(
			'<div class="guichet" data-guichet="%s" style="--guichet-height:%dpx">%s<div class="guichet-chat"></div><div class="guichet-foot"><span>%s</span><span class="guichet-count"></span></div></div>',
			esc_attr( wp_json_encode( $config ) ),
			max( 280, min( 2000, $height ) ),
			$title ? self::head( $g, $name, $open ) : '',
			esc_html__( 'One question at a time', 'guichet' )
		);
	}

	/** The bar above the chat: its sign, name, description, open or closed. */
	private static function head( array $g, string $name, ?bool $open ): string {
		$pill = null === $open ? '' : sprintf(
			'<span class="guichet-pill" data-state="%s"><i></i><span>%s</span></span>',
			$open ? 'open' : 'closed',
			$open ? esc_html__( 'Open', 'guichet' ) : esc_html__( 'Closed', 'guichet' )
		);
		return sprintf(
			'<div class="guichet-head"><span class="guichet-sign" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5M12 16.5h.01"/></svg></span><span class="guichet-who"><strong>%s</strong>%s</span>%s</div>',
			esc_html( $name ),
			'' !== $g['description'] ? '<small>' . esc_html( wp_trim_words( $g['description'], 12 ) ) . '</small>' : '',
			$pill
		);
	}

	/** The chat's own lines, in the site's language. %1$s, %2$s… are filled in the browser. */
	private static function texts( array $g, string $name ): array {
		return array(
			'open'         => __( 'Open', 'guichet' ),
			'closed'       => __( 'Closed', 'guichet' ),
			'placeholder'  => '' !== $g['welcome'] ? $g['welcome'] : __( 'Ask your question…', 'guichet' ),
			/* translators: %s: the guichet's name */
			'closedLine'   => sprintf( __( '%s is away for the moment. Come back a little later: your earlier messages stay here.', 'guichet' ), $name ),
			'closedBox'    => __( 'The guichet is closed', 'guichet' ),
			'limitBox'     => __( 'Limit reached', 'guichet' ),
			/* translators: 1: how many questions were asked */
			'limitHour'    => __( 'You have asked %1$s questions this hour.', 'guichet' ),
			/* translators: 1: how many questions were asked */
			'limitDay'     => __( 'You have asked %1$s questions today.', 'guichet' ),
			'limitChars'   => __( 'You have reached the amount of text allowed for now.', 'guichet' ),
			'limitTotal'   => __( 'This guichet has taken all the questions it can for now.', 'guichet' ),
			/* translators: 1: a time, such as 15:00 */
			'next'         => __( 'Next question possible at %1$s.', 'guichet' ),
			/* translators: 1: questions asked, 2: the most allowed */
			'countHour'    => __( '%1$s / %2$s this hour', 'guichet' ),
			/* translators: 1: questions asked, 2: the most allowed */
			'countDay'     => __( '%1$s / %2$s today', 'guichet' ),
			'oneAtATime'   => __( 'One question at a time: wait for the answer.', 'guichet' ),
			/* translators: 1: the most characters in a question */
			'tooLong'      => __( '%1$s characters at most.', 'guichet' ),
			'closedNow'    => __( 'The guichet is closed for the moment.', 'guichet' ),
			'signIn'       => __( 'Sign in to ask a question.', 'guichet' ),
		);
	}
}
