<?php
/**
 * Settings › Guichet: the list of guichets, a guichet's page (Général, Accès, Limites, Jetons,
 * Intégration, with its state beside), its journal. Administrators only (manage_options); every
 * change goes through admin-post.php with a nonce.
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

final class Guichet_Admin {

	const PAGE = 'guichet';

	public static function boot(): void {
		add_action( 'admin_menu', array( self::class, 'menu' ) );
		add_action( 'admin_post_guichet_save', array( self::class, 'save' ) );
		add_action( 'admin_post_guichet_delete', array( self::class, 'delete' ) );
		add_action( 'admin_enqueue_scripts', array( self::class, 'assets' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( GUICHET_FILE ), array( self::class, 'links' ) );
	}

	public static function menu(): void {
		add_options_page( 'Guichet', 'Guichet', 'manage_options', self::PAGE, array( self::class, 'page' ) );
	}

	public static function links( array $links ): array {
		array_unshift( $links, sprintf( '<a href="%s">%s</a>', esc_url( self::url() ), esc_html__( 'Settings', 'guichet' ) ) );
		return $links;
	}

	public static function assets( string $hook ): void {
		if ( 'settings_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'guichet-admin', GUICHET_URL . 'assets/admin.css', array(), GUICHET_VERSION );
		wp_enqueue_script( 'guichet-admin', GUICHET_URL . 'assets/admin.js', array(), GUICHET_VERSION, true );
		wp_localize_script(
			'guichet-admin',
			'guichetAdmin',
			array(
				'copied'  => __( 'Copied', 'guichet' ),
				'sure'    => __( 'Delete this guichet, its threads and its tokens? This cannot be undone.', 'guichet' ),
				'revoke'  => __( 'Revoke this token? The engine using it will be refused at once.', 'guichet' ),
			)
		);
	}

	private static function url( array $args = array() ): string {
		return add_query_arg( $args, admin_url( 'options-general.php?page=' . self::PAGE ) );
	}

	/** One request's input, read only after the capability and the nonce were checked. */
	private static function arg( string $k ): string {
		return isset( $_GET[ $k ] ) ? sanitize_text_field( wp_unslash( $_GET[ $k ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only view arguments
	}

	public static function page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'guichet' ) );
		}
		$action = self::arg( 'action' );
		$id     = sanitize_key( self::arg( 'id' ) );
		echo '<div class="wrap guichet-admin">';
		self::notice();
		if ( 'new' === $action ) {
			self::edit( '', Guichet_Store::defaults() );
		} elseif ( 'edit' === $action && Guichet_Store::get( $id ) ) {
			self::edit( $id, Guichet_Store::get( $id ) );
		} elseif ( 'journal' === $action && Guichet_Store::get( $id ) ) {
			self::journal( $id, Guichet_Store::get( $id ) );
		} else {
			self::listing();
		}
		echo '</div>';
	}

	private static function notice(): void {
		$said = array(
			'saved'   => __( 'Guichet saved.', 'guichet' ),
			'deleted' => __( 'Guichet deleted.', 'guichet' ),
			'revoked' => __( 'Token revoked.', 'guichet' ),
			'taken'   => __( 'This identifier is already used by another guichet.', 'guichet' ),
			'badid'   => __( 'The identifier needs letters or digits (a-z, 0-9, -).', 'guichet' ),
		);
		$k = self::arg( 'guichet_msg' );
		if ( isset( $said[ $k ] ) ) {
			$type = in_array( $k, array( 'taken', 'badid' ), true ) ? 'error' : 'success';
			printf( '<div class="notice notice-%s is-dismissible"><p>%s</p></div>', esc_attr( $type ), esc_html( $said[ $k ] ) );
		}
	}

	/* ---------- the list ---------- */

	/** "seen 8 s ago", or "no token". */
	private static function seen( array $st ): string {
		if ( ! $st['lastPoll'] ) {
			return $st['tokens'] ? __( 'never connected', 'guichet' ) : __( 'no token', 'guichet' );
		}
		/* translators: %s: a duration, such as "8 seconds" */
		return sprintf( __( 'seen %s ago', 'guichet' ), human_time_diff( (int) strtotime( $st['lastPoll'] ), time() ) );
	}

	private static function audience( array $g ): array {
		$roles = wp_roles()->get_names();
		if ( 'everyone' === $g['access'] ) {
			return array( 'all', __( 'Everyone', 'guichet' ), __( 'visitors known by IP + cookie', 'guichet' ) );
		}
		if ( 'members' === $g['access'] ) {
			$names = array_map( static fn ( $r ) => translate_user_role( $roles[ $r ] ?? $r ), $g['roles'] );
			$names[] = translate_user_role( 'Administrator' );
			return array( 'mem', __( 'Signed-in members', 'guichet' ), implode( ', ', $names ) );
		}
		return array( 'adm', __( 'Administrators only', 'guichet' ), '' );
	}

	private static function listing(): void {
		$all   = Guichet_Store::all();
		$relay = Guichet_Plugin::relay();
		$sum   = array( 'open' => 0, 'asked' => 0, 'answered' => 0, 'late' => 0, 'seconds' => 0 );
		$rows  = array();
		foreach ( array_keys( $all ) as $id ) {
			$g  = Guichet_Store::get( $id );
			$st = $relay->status( $id );
			$sum['open'] += $st['open'] ? 1 : 0;
			foreach ( array( 'asked', 'answered', 'late', 'seconds' ) as $k ) {
				$sum[ $k ] += $st['today'][ $k ];
			}
			$rows[ $id ] = array( $g, $st );
		}
		printf( '<h1 class="wp-heading-inline">Guichet</h1> <a class="page-title-action" href="%s">%s</a><hr class="wp-header-end">', esc_url( self::url( array( 'action' => 'new' ) ) ), esc_html__( 'Add a guichet', 'guichet' ) );
		echo '<div class="notice notice-info inline guichet-intro"><p>' . wp_kses( __( 'Each guichet has its audience, its limits and its tokens. Place it with a shortcode or the <strong>Guichet</strong> block.', 'guichet' ), array( 'strong' => array() ) ) . '</p></div>';
		$done = $sum['answered'] + $sum['late'];
		$cards = array(
			/* translators: 1: open guichets, 2: all guichets */
			array( __( 'Open guichets', 'guichet' ), sprintf( __( '%1$s <small>of %2$s</small>', 'guichet' ), number_format_i18n( $sum['open'] ), number_format_i18n( count( $all ) ) ) ),
			array( __( 'Questions today', 'guichet' ), esc_html( number_format_i18n( $sum['asked'] ) ) ),
			array( __( 'Answered in time', 'guichet' ), $done ? esc_html( number_format_i18n( 100 * $sum['answered'] / $done ) . ' %' ) : '—' ),
			array( __( 'Average answer time', 'guichet' ), $sum['answered'] ? esc_html( number_format_i18n( $sum['seconds'] / $sum['answered'] ) . ' s' ) : '—' ),
		);
		echo '<div class="guichet-cards">';
		foreach ( $cards as $c ) {
			printf( '<div class="guichet-card"><span>%s</span><b>%s</b></div>', esc_html( $c[0] ), wp_kses( $c[1], array( 'small' => array() ) ) );
		}
		echo '</div>';
		printf(
			'<div class="tablenav top"><span class="displaying-num">%s</span><input type="search" class="guichet-filter" placeholder="%s" aria-label="%s"></div>',
			/* translators: %s: number of guichets */
			esc_html( sprintf( __( '%s items', 'guichet' ), number_format_i18n( count( $all ) ) ) ),
			esc_attr__( 'Search a guichet', 'guichet' ),
			esc_attr__( 'Search a guichet', 'guichet' )
		);
		$heads = '<tr><th scope="col" class="column-primary">' . esc_html__( 'Name', 'guichet' ) . '</th><th scope="col">' . esc_html__( 'Audience', 'guichet' ) . '</th><th scope="col">' . esc_html__( 'State', 'guichet' ) . '</th><th scope="col">' . esc_html__( 'Today', 'guichet' ) . '</th><th scope="col">' . esc_html__( 'Shortcode', 'guichet' ) . '</th></tr>';
		echo '<table class="wp-list-table widefat fixed striped guichet-list"><thead>' . $heads . '</thead><tbody>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts above
		if ( ! $rows ) {
			echo '<tr><td colspan="5">' . esc_html__( 'No guichet yet.', 'guichet' ) . '</td></tr>';
		}
		foreach ( $rows as $id => [ $g, $st ] ) {
			[ $tag, $who, $more ] = self::audience( $g );
			$cap   = Guichet_Store::day_cap( $g );
			$pct   = $cap ? min( 100, (int) round( 100 * $st['today']['asked'] / $cap ) ) : 0;
			$code  = sprintf( '[guichet id="%s"]', $id );
			$edit  = self::url( array( 'action' => 'edit', 'id' => $id ) );
			echo '<tr data-search="' . esc_attr( strtolower( $id . ' ' . $g['name'] . ' ' . $g['description'] ) ) . '">';
			printf(
				'<td class="column-primary"><a class="row-title" href="%s">%s</a><p>%s</p><div class="row-actions visible"><a href="%s">%s</a> | <a href="%s">%s</a> | <a href="%s">%s</a> | <a class="submitdelete guichet-delete" href="%s">%s</a></div></td>',
				esc_url( $edit ),
				esc_html( '' !== $g['name'] ? $g['name'] : $id ),
				esc_html( $g['description'] ),
				esc_url( $edit ),
				esc_html__( 'Edit', 'guichet' ),
				esc_url( $edit . '#jetons' ),
				/* translators: %s: number of active tokens */
				esc_html( sprintf( __( 'Tokens (%s)', 'guichet' ), number_format_i18n( $st['tokens'] ) ) ),
				esc_url( self::url( array( 'action' => 'journal', 'id' => $id ) ) ),
				esc_html__( 'Journal', 'guichet' ),
				esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=guichet_delete&id=' . $id ), 'guichet_delete_' . $id ) ),
				esc_html__( 'Delete', 'guichet' )
			);
			printf( '<td><span class="guichet-tag %s">%s</span><br><span class="description">%s</span></td>', esc_attr( $tag ), esc_html( $who ), esc_html( $more ) );
			printf( '<td><span class="guichet-dot %s"></span> %s<br><span class="description">%s</span></td>', $st['open'] ? 'on' : 'off', $st['open'] ? esc_html__( 'Open', 'guichet' ) : esc_html__( 'Closed', 'guichet' ), esc_html( self::seen( $st ) ) );
			printf(
				'<td>%s<div class="guichet-bar"><i style="width:%d%%"></i></div><span class="description">%s</span></td>',
				/* translators: %s: number of questions */
				esc_html( sprintf( __( '%s questions', 'guichet' ), number_format_i18n( $st['today']['asked'] ) ) ),
				(int) $pct,
				/* translators: %s: a percentage */
				$cap ? esc_html( sprintf( __( '%s %% of the daily cap', 'guichet' ), number_format_i18n( $pct ) ) ) : '—'
			);
			printf( '<td><code>%s</code> <button type="button" class="button button-small guichet-copy" data-copy="%s">%s</button></td>', esc_html( $code ), esc_attr( $code ), esc_html__( 'Copy', 'guichet' ) );
			echo '</tr>';
		}
		echo '</tbody><tfoot>' . $heads . '</tfoot></table>'; // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts above
		echo '<p class="description">' . esc_html__( 'Open: an engine connected in the last minute. Closed: nobody at the guichet, asking is turned off on the site.', 'guichet' ) . '</p>';
	}

	/* ---------- a guichet's page ---------- */

	private static function field( string $label, string $control, string $help = '' ): void {
		printf( '<tr><th scope="row">%s</th><td>%s%s</td></tr>', $label, $control, '' !== $help ? '<p class="description">' . esc_html( $help ) . '</p>' : '' ); // phpcs:ignore WordPress.Security.EscapeOutput -- callers pass escaped label and control
	}

	private static function box( string $id, string $title, string $aside = '' ): void {
		printf( '<div class="postbox guichet-section" id="%s"><div class="postbox-header"><h2>%s</h2><span class="description">%s</span></div><div class="inside">', esc_attr( $id ), esc_html( $title ), esc_html( $aside ) );
	}

	private static function edit( string $id, array $g ): void {
		$is_new = '' === $id;
		$name   = '' !== $g['name'] ? $g['name'] : $id;
		if ( $is_new ) {
			echo '<h1>' . esc_html__( 'Add a guichet', 'guichet' ) . '</h1>';
		} else {
			/* translators: %s: the guichet's name */
			echo '<h1 class="wp-heading-inline">' . esc_html( sprintf( __( 'Edit the guichet “%s”', 'guichet' ), $name ) ) . '</h1>';
		}
		printf( ' <a class="page-title-action" href="%s">%s</a><hr class="wp-header-end">', esc_url( self::url() ), esc_html__( '← All guichets', 'guichet' ) );
		$tabs = array(
			'general'     => __( 'General', 'guichet' ),
			'acces'       => __( 'Access', 'guichet' ),
			'limites'     => __( 'Limits', 'guichet' ),
			'jetons'      => __( 'Tokens', 'guichet' ),
			'integration' => __( 'Integration', 'guichet' ),
		);
		if ( $is_new ) {
			unset( $tabs['jetons'], $tabs['integration'] );
		}
		echo '<nav class="nav-tab-wrapper guichet-tabs">';
		foreach ( $tabs as $k => $label ) {
			printf( '<a class="nav-tab" href="#%s">%s</a>', esc_attr( $k ), esc_html( $label ) );
		}
		echo '</nav>';
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="guichet-form"><input type="hidden" name="action" value="guichet_save">';
		wp_nonce_field( 'guichet_save' );
		/* Enter in a field submits with the form's first button: this one, not a "Revoke" below. */
		echo '<button class="screen-reader-text" name="do" value="save" tabindex="-1" aria-hidden="true">' . esc_html__( 'Save', 'guichet' ) . '</button>';
		printf( '<input type="hidden" name="old_id" value="%s">', esc_attr( $id ) );
		echo '<div class="guichet-columns"><div class="guichet-main">';

		/* Général */
		self::box( 'general', __( 'General', 'guichet' ) );
		echo '<table class="form-table" role="presentation">';
		self::field( esc_html__( 'Name', 'guichet' ), sprintf( '<input class="regular-text" name="g[name]" value="%s" required>', esc_attr( $g['name'] ) ), __( 'Shown at the top of the chat.', 'guichet' ) );
		self::field(
			esc_html__( 'Identifier', 'guichet' ),
			$is_new ? '<input name="id" pattern="[a-z0-9][a-z0-9\-]*" maxlength="63" required>' : sprintf( '<code>%s</code><input type="hidden" name="id" value="%s">', esc_html( $id ), esc_attr( $id ) ),
			$is_new ? __( 'Used in the shortcode and the engine address: a-z, 0-9 and -. It cannot change later.', 'guichet' ) : __( 'Used in the shortcode and the engine address.', 'guichet' )
		);
		self::field( esc_html__( 'Description', 'guichet' ), sprintf( '<textarea class="large-text" rows="2" name="g[description]">%s</textarea>', esc_textarea( $g['description'] ) ) );
		$langs = array(
			'fr' => 'Français',
			'en' => 'English',
		);
		$opts  = '';
		foreach ( $langs as $k => $l ) {
			$opts .= sprintf( '<option value="%s"%s>%s</option>', esc_attr( $k ), selected( $g['lang'], $k, false ), esc_html( $l ) );
		}
		self::field( esc_html__( 'Language', 'guichet' ), '<select name="g[lang]">' . $opts . '</select>', __( 'Of the answers and of the guichet’s own lines (late answer, answer cut).', 'guichet' ) );
		self::field( esc_html__( 'Welcome message', 'guichet' ), sprintf( '<input class="large-text" name="g[welcome]" value="%s" placeholder="%s">', esc_attr( $g['welcome'] ), esc_attr__( 'Ask your question…', 'guichet' ) ), __( 'Shown in the empty question box.', 'guichet' ) );
		self::field( esc_html__( 'Tone', 'guichet' ), sprintf( '<input class="large-text" name="g[tone]" maxlength="300" value="%s" placeholder="%s">', esc_attr( $g['tone'] ), esc_attr__( 'e.g. sober and warm', 'guichet' ) ), __( 'Style of the answers, in free text. Empty: neutral and sober.', 'guichet' ) );
		echo '</table></div></div>';

		/* Accès */
		self::box( 'acces', __( 'Access', 'guichet' ), __( 'who may ask a question', 'guichet' ) );
		$radio = static fn ( $v, $label, $more ) => sprintf( '<label class="guichet-radio"><input type="radio" name="g[access]" value="%s"%s> <strong>%s</strong>%s</label>', esc_attr( $v ), checked( $g['access'], $v, false ), esc_html( $label ), '' !== $more ? ' — ' . esc_html( $more ) : '' );
		echo $radio( 'admins', __( 'Administrators only', 'guichet' ), __( 'by default', 'guichet' ) ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in $radio
		echo $radio( 'members', __( 'Signed-in members', 'guichet' ), '' ); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '<fieldset class="guichet-roles"><legend>' . esc_html__( 'Roles allowed:', 'guichet' ) . '</legend>';
		foreach ( wp_roles()->get_names() as $role => $label ) {
			if ( 'administrator' === $role ) {
				printf( '<label><input type="checkbox" checked disabled> %s</label>', esc_html( translate_user_role( $label ) ) );
				continue;
			}
			printf( '<label><input type="checkbox" name="g[roles][]" value="%s"%s> %s</label>', esc_attr( $role ), checked( in_array( $role, $g['roles'], true ), true, false ), esc_html( translate_user_role( $label ) ) );
		}
		echo '</fieldset>';
		echo $radio( 'everyone', __( 'Everyone', 'guichet' ), __( 'anonymous visitors included', 'guichet' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '<p class="description guichet-indent">' . esc_html__( 'Visitors are known by IP address + cookie. Keep the per-IP limits low.', 'guichet' ) . '</p>';
		echo '<table class="form-table" role="presentation">';
		self::field(
			esc_html__( 'To others', 'guichet' ),
			sprintf(
				'<select name="g[others]"><option value="login"%s>%s</option><option value="hide"%s>%s</option></select>',
				selected( $g['others'], 'login', false ),
				esc_html__( 'Show “Sign in to ask a question”', 'guichet' ),
				selected( $g['others'], 'hide', false ),
				esc_html__( 'Show nothing', 'guichet' )
			)
		);
		echo '</table></div></div>';

		/* Limites */
		self::box( 'limites', __( 'Limits', 'guichet' ), __( 'empty = no limit', 'guichet' ) );
		echo '<table class="widefat guichet-limits"><thead><tr><th>' . esc_html__( 'Limit', 'guichet' ) . '</th><th>' . esc_html__( 'Window', 'guichet' ) . '</th><th>' . esc_html__( 'Per IP', 'guichet' ) . '<br><small>' . esc_html__( 'visitors not signed in', 'guichet' ) . '</small></th><th>' . esc_html__( 'Per account', 'guichet' ) . '</th><th>' . esc_html__( 'Whole guichet', 'guichet' ) . '</th><th></th></tr></thead><tbody>';
		$limits = $g['limits'] ? $g['limits'] : array( array( 'what' => 'questions', 'window' => 'hour', 'ip' => '', 'account' => '', 'total' => '' ) );
		foreach ( array_values( $limits ) as $i => $l ) {
			self::limit_row( (string) $i, $l );
		}
		echo '</tbody></table><template id="guichet-limit-row">';
		self::limit_row( '__i__', array( 'what' => 'questions', 'window' => 'day', 'ip' => '', 'account' => '', 'total' => '' ) );
		echo '</template><p><button type="button" class="button button-small guichet-add-limit">' . esc_html__( '+ Add a limit', 'guichet' ) . '</button></p>';
		echo '<table class="form-table" role="presentation">';
		$num = static fn ( $name, $v, $unit ) => sprintf( '<input type="number" class="small-text" min="1" name="g[%s]" value="%d"> %s', esc_attr( $name ), (int) $v, esc_html( $unit ) );
		self::field( esc_html__( 'Question size', 'guichet' ), $num( 'maxQuestion', $g['maxQuestion'], __( 'characters at most', 'guichet' ) ) );
		self::field( esc_html__( 'Answer size', 'guichet' ), $num( 'maxAnswer', $g['maxAnswer'], __( 'characters at most', 'guichet' ) ), __( 'Beyond, the answer is cut and says so.', 'guichet' ) );
		self::field( esc_html__( 'Answer timeout', 'guichet' ), $num( 'answerMin', $g['answerMin'], __( 'minutes', 'guichet' ) ), __( 'One question at a time per person.', 'guichet' ) );
		echo '</table></div></div>';

		if ( ! $is_new ) {
			self::tokens( $id );
			self::integration( $id, $g );
		}
		echo '</div><div class="guichet-side">';
		self::state( $id, $is_new );
		self::box( 'journal', __( 'Journal', 'guichet' ) );
		printf( '<p><label><input type="checkbox" name="g[journal]" value="1"%s> %s</label></p>', checked( $g['journal'], true, false ), esc_html__( 'Keep a journal', 'guichet' ) );
		printf( '<p><label><input type="checkbox" name="g[journalText]" value="1"%s> %s</label></p>', checked( $g['journalText'], true, false ), esc_html__( 'Keep the text of questions', 'guichet' ) );
		echo '<p class="description">' . esc_html__( 'Otherwise: who, when, how long, answered or not.', 'guichet' ) . '</p>';
		if ( ! $is_new ) {
			printf( '<p><a href="%s">%s</a></p>', esc_url( self::url( array( 'action' => 'journal', 'id' => $id ) ) ), esc_html__( 'See the journal →', 'guichet' ) );
		}
		echo '</div></div></div></div></form>';
	}

	private static function limit_row( string $i, array $l ): void {
		$what = sprintf(
			'<select name="g[limits][%1$s][what]"><option value="questions"%2$s>%3$s</option><option value="chars"%4$s>%5$s</option></select>',
			esc_attr( $i ),
			selected( $l['what'], 'questions', false ),
			esc_html__( 'Questions', 'guichet' ),
			selected( $l['what'], 'chars', false ),
			esc_html__( 'Total volume (characters)', 'guichet' )
		);
		$win  = sprintf(
			'<select name="g[limits][%1$s][window]"><option value="hour"%2$s>%3$s</option><option value="day"%4$s>%5$s</option></select>',
			esc_attr( $i ),
			selected( $l['window'], 'hour', false ),
			esc_html__( 'per hour', 'guichet' ),
			selected( $l['window'], 'day', false ),
			esc_html__( 'per day', 'guichet' )
		);
		echo '<tr><td>' . $what . '</td><td>' . $win . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above
		foreach ( array( 'ip', 'account', 'total' ) as $scope ) {
			printf( '<td><input type="number" min="0" class="guichet-num" name="g[limits][%s][%s]" value="%s"></td>', esc_attr( $i ), esc_attr( $scope ), esc_attr( (string) ( $l[ $scope ] ?? '' ) ) );
		}
		echo '<td><button type="button" class="button-link guichet-remove-limit" aria-label="' . esc_attr__( 'Remove this limit', 'guichet' ) . '">×</button></td></tr>';
	}

	private static function tokens( string $id ): void {
		self::box( 'jetons', __( 'Tokens', 'guichet' ), __( 'one per connected engine', 'guichet' ) );
		$fresh = get_transient( 'guichet_token_' . get_current_user_id() );
		if ( is_array( $fresh ) && ( $fresh['guichet'] ?? '' ) === $id ) {
			delete_transient( 'guichet_token_' . get_current_user_id() );
			printf(
				'<div class="guichet-token-new"><p><strong>%s</strong> %s</p><p><input type="text" class="large-text code" readonly value="%s" onfocus="this.select()"> <button type="button" class="button button-primary guichet-copy" data-copy="%s">%s</button></p></div>',
				/* translators: %s: the token's label */
				esc_html( sprintf( __( 'Token “%s” created.', 'guichet' ), $fresh['label'] ) ),
				esc_html__( 'Copy it now: it will not be shown again.', 'guichet' ),
				esc_attr( $fresh['token'] ),
				esc_attr( $fresh['token'] ),
				esc_html__( 'Copy', 'guichet' )
			);
		}
		$list = array_reverse( Guichet_Plugin::relay()->tokens( $id ) );
		echo '<table class="widefat striped guichet-tokens"><thead><tr><th>' . esc_html__( 'Label', 'guichet' ) . '</th><th>' . esc_html__( 'Created', 'guichet' ) . '</th><th>' . esc_html__( 'Last connection', 'guichet' ) . '</th><th>' . esc_html__( 'Engine', 'guichet' ) . '</th><th></th></tr></thead><tbody>';
		if ( ! $list ) {
			echo '<tr><td colspan="5">' . esc_html__( 'No token yet: create one for each engine.', 'guichet' ) . '</td></tr>';
		}
		foreach ( $list as $t ) {
			$recent = $t['lastSeen'] && time() - strtotime( $t['lastSeen'] ) < 60;
			printf(
				'<tr class="%s"><td><strong>%s</strong><br><code>gch_…%s</code></td><td>%s</td><td><span class="guichet-dot %s"></span> %s</td><td>%s</td><td>%s</td></tr>',
				$t['revoked'] ? 'guichet-revoked' : '',
				esc_html( $t['label'] ),
				esc_html( $t['hint'] ?? '' ),
				esc_html( wp_date( get_option( 'date_format' ), strtotime( $t['created'] ) ) ),
				$recent ? 'on' : 'off',
				/* translators: %s: a duration */
				esc_html( $t['lastSeen'] ? sprintf( __( '%s ago', 'guichet' ), human_time_diff( strtotime( $t['lastSeen'] ), time() ) ) : __( 'never', 'guichet' ) ),
				esc_html( $t['engine'] ? trim( $t['engine'] . ' ' . $t['version'] ) : '—' ),
				$t['revoked']
					? esc_html__( 'Revoked', 'guichet' )
					: sprintf( '<button class="button-link button-link-delete guichet-revoke" name="do" value="%s">%s</button>', esc_attr( 'revoke:' . $t['id'] ), esc_html__( 'Revoke', 'guichet' ) )
			);
		}
		echo '</tbody></table>';
		printf( '<p class="guichet-token-add"><input name="token_label" maxlength="80" placeholder="%s" aria-label="%s"> <button class="button" name="do" value="token">%s</button></p>', esc_attr__( 'Token label', 'guichet' ), esc_attr__( 'Token label', 'guichet' ), esc_html__( 'New token', 'guichet' ) );
		echo '</div></div>';
	}

	private static function integration( string $id, array $g ): void {
		self::box( 'integration', __( 'Integration', 'guichet' ) );
		$code = sprintf( '[guichet id="%s"]', $id );
		$url  = Guichet_Plugin::engine_url( $id );
		$env  = "GUICHET_RELAY=$url\nGUICHET_TOKEN=gch_…   # " . __( 'a token from the Tokens tab', 'guichet' ) . "\nGUICHET_LANG=" . $g['lang'];
		echo '<div class="guichet-two"><div><h3>' . esc_html__( 'Shortcode', 'guichet' ) . '</h3>';
		printf( '<div class="guichet-code"><code>%s</code><button type="button" class="button button-small guichet-copy" data-copy="%s">%s</button></div>', esc_html( $code ), esc_attr( $code ), esc_html__( 'Copy', 'guichet' ) );
		echo '<p class="description">' . esc_html__( 'Options:', 'guichet' ) . ' <code>hauteur="520"</code> <code>titre="non"</code></p></div>';
		echo '<div><h3>' . esc_html__( 'Block', 'guichet' ) . '</h3><p class="description">' . esc_html__( 'In the editor, add the “Guichet” block and pick this guichet in its list.', 'guichet' ) . '</p></div></div>';
		echo '<h3>' . esc_html__( 'Connect an engine', 'guichet' ) . '</h3><p class="description">' . esc_html__( 'The engine connects to this site; the site never calls the engine.', 'guichet' ) . '</p>';
		echo '<p>' . esc_html__( 'Address of the guichet, to paste in Clavarium with a token:', 'guichet' ) . '</p>';
		printf( '<div class="guichet-code dark"><code>%s</code><button type="button" class="button button-small guichet-copy" data-copy="%s">%s</button></div>', esc_html( $url ), esc_attr( $url ), esc_html__( 'Copy', 'guichet' ) );
		echo '<p>' . esc_html__( 'Or on the command line:', 'guichet' ) . '</p>';
		printf( '<div class="guichet-code dark"><pre>%s</pre><button type="button" class="button button-small guichet-copy" data-copy="%s">%s</button></div>', esc_html( $env ), esc_attr( $env ), esc_html__( 'Copy', 'guichet' ) );
		echo '<p class="description">' . esc_html__( 'The engine sends its token in Authorization and in X-Guichet-Token, for hosts (Apache + PHP-FPM, security plugins) that drop the first.', 'guichet' ) . '</p>';
		echo '</div></div>';
	}

	private static function state( string $id, bool $is_new ): void {
		self::box( 'etat', __( 'State', 'guichet' ) );
		if ( ! $is_new ) {
			$st = Guichet_Plugin::relay()->status( $id );
			printf( '<p class="guichet-state"><span class="guichet-dot %s"></span> <strong>%s</strong></p><p class="description">%s</p>', $st['open'] ? 'on' : 'off', $st['open'] ? esc_html__( 'Open', 'guichet' ) : esc_html__( 'Closed', 'guichet' ), esc_html( self::seen( $st ) ) );
			echo '<dl class="guichet-facts">';
			$facts = array(
				/* translators: %s: number of questions */
				__( 'Today', 'guichet' )         => sprintf( __( '%s questions', 'guichet' ), number_format_i18n( $st['today']['asked'] ) ),
				__( 'Waiting', 'guichet' )       => number_format_i18n( $st['waiting'] ),
				__( 'Late', 'guichet' )          => number_format_i18n( $st['today']['late'] ),
				__( 'Active tokens', 'guichet' ) => number_format_i18n( $st['tokens'] ),
			);
			foreach ( $facts as $k => $v ) {
				printf( '<dt>%s</dt><dd>%s</dd>', esc_html( $k ), esc_html( $v ) );
			}
			echo '</dl>';
		}
		echo '</div><div class="guichet-actions">';
		if ( ! $is_new ) {
			printf( '<a class="submitdelete guichet-delete" href="%s">%s</a>', esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=guichet_delete&id=' . $id ), 'guichet_delete_' . $id ) ), esc_html__( 'Delete', 'guichet' ) );
		}
		echo '<button class="button button-primary" name="do" value="save">' . esc_html__( 'Save', 'guichet' ) . '</button></div></div>';
	}

	/* ---------- the journal ---------- */

	private static function journal( string $id, array $g ): void {
		/* translators: %s: the guichet's name */
		printf( '<h1 class="wp-heading-inline">%s</h1> <a class="page-title-action" href="%s">%s</a><hr class="wp-header-end">', esc_html( sprintf( __( 'Journal of “%s”', 'guichet' ), '' !== $g['name'] ? $g['name'] : $id ) ), esc_url( self::url( array( 'action' => 'edit', 'id' => $id ) ) ), esc_html__( '← The guichet', 'guichet' ) );
		if ( ! $g['journal'] ) {
			echo '<div class="notice notice-info inline"><p>' . esc_html__( 'The journal is off for this guichet (tick “Keep a journal” on its page).', 'guichet' ) . '</p></div>';
		}
		$outcomes = array(
			'asked'    => __( 'asked', 'guichet' ),
			'answered' => __( 'answered', 'guichet' ),
			'timeout'  => __( 'not answered in time', 'guichet' ),
			'limit'    => __( 'refused: limit', 'guichet' ),
		);
		echo '<table class="widefat striped"><thead><tr><th>' . esc_html__( 'When', 'guichet' ) . '</th><th>' . esc_html__( 'Who', 'guichet' ) . '</th><th>' . esc_html__( 'What', 'guichet' ) . '</th><th>' . esc_html__( 'How long', 'guichet' ) . '</th><th>' . esc_html__( 'Question', 'guichet' ) . '</th></tr></thead><tbody>';
		$lines = Guichet_Plugin::relay()->journalLines( $id, 300 );
		if ( ! $lines ) {
			echo '<tr><td colspan="5">' . esc_html__( 'Nothing yet.', 'guichet' ) . '</td></tr>';
		}
		foreach ( $lines as $l ) {
			printf(
				'<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>',
				esc_html( wp_date( get_option( 'date_format' ) . ' H:i:s', strtotime( (string) ( $l['at'] ?? '' ) ) ) ),
				esc_html( Guichet_Plugin::who_label( (string) ( $l['who'] ?? '' ) ) ),
				esc_html( ( $outcomes[ $l['outcome'] ?? '' ] ?? (string) ( $l['outcome'] ?? '' ) ) . ( isset( $l['limit'] ) ? ' (' . $l['limit'] . ')' : '' ) ),
				isset( $l['seconds'] ) ? esc_html( number_format_i18n( (float) $l['seconds'], 1 ) . ' s' ) : '',
				esc_html( (string) ( $l['text'] ?? '' ) )
			);
		}
		echo '</tbody></table>';
	}

	/* ---------- changes ---------- */

	public static function save(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'guichet' ), 403 );
		}
		check_admin_referer( 'guichet_save' );
		$old   = isset( $_POST['old_id'] ) ? sanitize_key( wp_unslash( $_POST['old_id'] ) ) : '';
		$typed = isset( $_POST['id'] ) ? sanitize_text_field( wp_unslash( $_POST['id'] ) ) : '';
		$id    = '' !== $old ? $old : Guichet_Store::slug( $typed );
		if ( '' === $old ) {
			if ( '' === $id ) {
				wp_safe_redirect( self::url( array( 'action' => 'new', 'guichet_msg' => 'badid' ) ) );
				exit;
			}
			if ( Guichet_Store::get( $id ) ) {
				wp_safe_redirect( self::url( array( 'action' => 'new', 'guichet_msg' => 'taken' ) ) );
				exit;
			}
		} elseif ( ! Guichet_Store::get( $old ) ) {
			wp_safe_redirect( self::url() );
			exit;
		}
		$in = isset( $_POST['g'] ) && is_array( $_POST['g'] ) ? wp_unslash( $_POST['g'] ) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- every field is cleaned in Guichet_Store::clean()
		Guichet_Store::put( $id, Guichet_Store::clean( $in, array_keys( wp_roles()->get_names() ) ) );
		$do   = isset( $_POST['do'] ) ? sanitize_text_field( wp_unslash( $_POST['do'] ) ) : 'save';
		$msg  = 'saved';
		$hash = '';
		if ( 'token' === $do ) {
			$label = isset( $_POST['token_label'] ) ? sanitize_text_field( wp_unslash( $_POST['token_label'] ) ) : '';
			$t     = Guichet_Plugin::relay()->createToken( $id, '' !== $label ? $label : __( 'engine', 'guichet' ) );
			/* Shown once, on the page this redirects to, then forgotten. */
			set_transient( 'guichet_token_' . get_current_user_id(), array( 'guichet' => $id, 'token' => $t['token'], 'label' => $t['label'] ), 120 );
			$msg  = '';
			$hash = '#jetons';
		} elseif ( str_starts_with( $do, 'revoke:' ) ) {
			Guichet_Plugin::relay()->revokeToken( $id, substr( $do, 7 ) );
			$msg  = 'revoked';
			$hash = '#jetons';
		}
		wp_safe_redirect( self::url( array_filter( array( 'action' => 'edit', 'id' => $id, 'guichet_msg' => $msg ) ) ) . $hash );
		exit;
	}

	public static function delete(): void {
		$id = isset( $_GET['id'] ) ? sanitize_key( wp_unslash( $_GET['id'] ) ) : '';
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to do this.', 'guichet' ), 403 );
		}
		check_admin_referer( 'guichet_delete_' . $id );
		if ( Guichet_Store::get( $id ) ) {
			Guichet_Plugin::relay()->forget( $id );
			Guichet_Store::remove( $id );
		}
		wp_safe_redirect( self::url( array( 'guichet_msg' => 'deleted' ) ) );
		exit;
	}
}
