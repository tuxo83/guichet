<?php
/**
 * /wp-json/guichet/v1/<id>/messages|say            the chat (WordPress's access rules first)
 * /wp-json/guichet/v1/<id>/engine/poll|doing|answer the engine (its token, checked by the relay)
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

final class Guichet_Rest {

	const NS = 'guichet/v1';
	const ID = '(?P<id>[a-z0-9][a-z0-9-]{0,62})';

	public static function routes(): void {
		register_rest_route(
			self::NS,
			'/' . self::ID . '/messages',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( self::class, 'chat' ),
				'permission_callback' => array( self::class, 'may_ask' ),
			)
		);
		register_rest_route(
			self::NS,
			'/' . self::ID . '/say',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( self::class, 'chat' ),
				'permission_callback' => array( self::class, 'may_ask' ),
			)
		);
		register_rest_route(
			self::NS,
			'/' . self::ID . '/engine/(?P<what>poll|doing|answer)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( self::class, 'engine' ),
				/* No WordPress account here: the engine proves itself with its guichet's token, which
				   the relay checks (hash_equals over that guichet's tokens) before anything else. */
				'permission_callback' => '__return_true',
			)
		);
	}

	/** The site's own rules, before the relay is even asked. */
	public static function may_ask( WP_REST_Request $request ) {
		$g = Guichet_Store::get( self::id( $request ) );
		if ( ! $g ) {
			return new WP_Error( 'guichet_unknown', __( 'No such guichet.', 'guichet' ), array( 'status' => 404 ) );
		}
		$ok = Guichet_Plugin::access( $g );
		if ( true === $ok ) {
			return true;
		}
		return 'login' === $ok
			? new WP_Error( 'guichet_login', __( 'Sign in to ask a question.', 'guichet' ), array( 'status' => 401 ) )
			: new WP_Error( 'guichet_forbidden', __( 'This guichet is not open to your account.', 'guichet' ), array( 'status' => 403 ) );
	}

	public static function chat( WP_REST_Request $request ): WP_REST_Response {
		$id   = self::id( $request );
		$rest = str_ends_with( $request->get_route(), '/say' ) ? '/say' : '/messages';
		return self::reply(
			Guichet_Plugin::relay()->respond(
				$request->get_method(),
				"/$id$rest",
				array(
					'who'  => Guichet_Plugin::who(),
					// Per address only for visitors who are not signed in: an office or a home behind one
					// address must not share one limit between its members (operator's choice, 31-10).
					'ip'   => is_user_logged_in() ? null : Guichet_Plugin::client_ip(),
					'body' => self::body( $request ),
				)
			)
		);
	}

	public static function engine( WP_REST_Request $request ): WP_REST_Response {
		$auth  = (string) $request->get_header( 'authorization' );
		$token = preg_match( '/^Bearer\s+(.+)$/i', $auth, $m ) ? $m[1] : (string) $request->get_header( 'x_guichet_token' );
		if ( 'poll' === $request->get_url_params()['what'] ) {
			/* The relay may hold this request ~20 s waiting for a question. */
			if ( function_exists( 'set_time_limit' ) ) {
				@set_time_limit( 60 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			}
			ignore_user_abort( false );
		}
		return self::reply(
			Guichet_Plugin::relay()->respond(
				'POST',
				'/' . self::id( $request ) . '/engine/' . $request->get_url_params()['what'],
				array(
					'token' => $token,
					'body'  => self::body( $request ),
				)
			)
		);
	}

	/** The guichet in the address. Not $request['id']: WordPress lets a JSON body's "id" (a question's,
	    in /engine/answer) override the address's. */
	private static function id( WP_REST_Request $request ): string {
		return (string) ( $request->get_url_params()['id'] ?? '' );
	}

	/** The JSON sent, as the relay wants it: [] when empty, null when it is not JSON. */
	private static function body( WP_REST_Request $request ): ?array {
		$raw = (string) $request->get_body();
		if ( '' === trim( $raw ) ) {
			return array();
		}
		$j = json_decode( $raw, true );
		return is_array( $j ) ? $j : null;
	}

	private static function reply( ?array $out ): WP_REST_Response {
		$out = $out ?? array( 404, array( 'error' => 'unknown' ) );
		$r   = new WP_REST_Response( $out[1], $out[0] );
		$r->header( 'Cache-Control', 'no-store' );
		return $r;
	}
}
