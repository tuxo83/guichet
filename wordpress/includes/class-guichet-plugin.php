<?php
/**
 * The plugin's spine: the relay, where its files go, and who may ask what.
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

final class Guichet_Plugin {

	const VISITOR_COOKIE = 'guichet_visitor';
	private static ?GuichetRelay $relay = null;

	public static function boot(): void {
		add_action( 'init', array( self::class, 'init' ) );
		add_action( 'rest_api_init', array( 'Guichet_Rest', 'routes' ) );
		if ( is_admin() ) {
			Guichet_Admin::boot();
		}
	}

	public static function init(): void {
		load_plugin_textdomain( 'guichet', false, dirname( plugin_basename( GUICHET_FILE ) ) . '/languages' );
		Guichet_Front::init();
	}

	public static function activate(): void {
		self::data_dir();
	}

	/**
	 * Where the relay keeps threads, tokens and counters. Best outside the web root: define
	 * GUICHET_DATA_DIR in wp-config.php. Otherwise under uploads, in a folder whose name is
	 * random (nginx ignores .htaccess: the name is then what keeps it unknown) with deny rules.
	 */
	public static function data_dir(): string {
		if ( defined( 'GUICHET_DATA_DIR' ) && GUICHET_DATA_DIR ) {
			$dir = untrailingslashit( (string) GUICHET_DATA_DIR );
		} else {
			$key = get_option( 'guichet_dir_key' );
			if ( ! is_string( $key ) || ! preg_match( '/^[a-f0-9]{16}$/', $key ) ) {
				$key = bin2hex( random_bytes( 8 ) );
				update_option( 'guichet_dir_key', $key, false );
			}
			$dir = wp_upload_dir( null, false )['basedir'] . '/guichet-' . $key;
		}
		if ( ! is_dir( $dir ) ) {
			wp_mkdir_p( $dir );
		}
		if ( ! file_exists( "$dir/.htaccess" ) ) {
			file_put_contents( "$dir/.htaccess", "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
			file_put_contents( "$dir/index.php", "<?php\n// Silence is golden.\n" ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		return $dir;
	}

	public static function relay(): GuichetRelay {
		if ( null === self::$relay ) {
			self::$relay = new GuichetRelay(
				array(
					'dir'         => self::data_dir(),
					'guichets'    => static function ( string $id ) {
						$g = Guichet_Store::get( $id );
						return $g ? Guichet_Store::for_relay( $g ) : null;
					},
					'timezone'    => wp_timezone_string(),
					/* A PHP worker is held while an engine waits: shorter than the relay's 25 s, for shared hosts. */
					'pollSeconds' => (int) apply_filters( 'guichet_poll_seconds', 20 ),
				)
			);
		}
		return self::$relay;
	}

	/** The visitor's address, for per-address limits. Behind a proxy, the site says how to read it. */
	public static function client_ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		return (string) apply_filters( 'guichet_client_ip', $ip );
	}

	/**
	 * May the current visitor ask this guichet? true, or 'login' (signing in may help) or 'forbidden'.
	 * Administrators always may: they set it up and must be able to try it.
	 */
	public static function access( array $g ) {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}
		if ( 'everyone' === $g['access'] ) {
			return true;
		}
		if ( ! is_user_logged_in() ) {
			return 'login';
		}
		if ( 'members' === $g['access'] && array_intersect( (array) wp_get_current_user()->roles, $g['roles'] ) ) {
			return true;
		}
		return 'forbidden';
	}

	/**
	 * Who asks, for the relay: the account when signed in, else a random visitor id kept in a cookie
	 * (only where the guichet is open to everyone; the per-address limits are what holds there).
	 */
	public static function who(): array {
		if ( is_user_logged_in() ) {
			return array( 'id' => 'u:' . get_current_user_id() );
		}
		$v = isset( $_COOKIE[ self::VISITOR_COOKIE ] ) ? sanitize_text_field( wp_unslash( $_COOKIE[ self::VISITOR_COOKIE ] ) ) : '';
		if ( ! preg_match( '/^[a-f0-9]{32}$/', $v ) ) {
			$v = bin2hex( random_bytes( 16 ) );
			if ( ! headers_sent() ) {
				setcookie(
					self::VISITOR_COOKIE,
					$v,
					array(
						'expires'  => time() + YEAR_IN_SECONDS,
						'path'     => COOKIEPATH ? COOKIEPATH : '/',
						'secure'   => is_ssl(),
						'httponly' => true,
						'samesite' => 'Lax',
					)
				);
			}
			$_COOKIE[ self::VISITOR_COOKIE ] = $v;
		}
		return array( 'id' => 'v:' . $v );
	}

	/** "u:12" as a person reads it (journal). */
	public static function who_label( string $who ): string {
		if ( str_starts_with( $who, 'u:' ) ) {
			$u = get_userdata( (int) substr( $who, 2 ) );
			return $u ? $u->display_name : $who;
		}
		/* translators: %s: the start of an anonymous visitor's random id */
		return sprintf( __( 'visitor %s', 'guichet' ), substr( $who, 2, 6 ) );
	}

	/** The address an engine is given for a guichet. */
	public static function engine_url( string $id ): string {
		return untrailingslashit( rest_url( 'guichet/v1/' . $id ) );
	}
}
