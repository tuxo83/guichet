<?php
/**
 * The guichets' settings, kept in one option. What the relay keeps (threads, tokens, counters) is
 * in its own folder, not here: settings are small and read on every request, the rest is not.
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

final class Guichet_Store {

	const OPTION = 'guichet_guichets';
	const ID     = '/^[a-z0-9][a-z0-9-]{0,62}$/';
	const ACCESS = array( 'admins', 'members', 'everyone' );

	/** What a new guichet starts with: the limits of the approved mockup. */
	public static function defaults(): array {
		return array(
			'name'        => '',
			'description' => '',
			'lang'        => str_starts_with( (string) get_locale(), 'fr' ) ? 'fr' : 'en',
			'welcome'     => '',
			'tone'        => '',
			'access'      => 'admins',
			'roles'       => array( 'subscriber', 'contributor', 'author', 'editor' ),
			'others'      => 'login',
			'limits'      => GuichetRelay::DEFAULTS['limits'],
			'maxQuestion' => 2000,
			'maxAnswer'   => 8000,
			'answerMin'   => 3,
			'journal'     => false,
			'journalText' => false,
		);
	}

	public static function all(): array {
		$all = get_option( self::OPTION, array() );
		return is_array( $all ) ? $all : array();
	}

	public static function get( string $id ): ?array {
		$all = self::all();
		return isset( $all[ $id ] ) && is_array( $all[ $id ] ) ? $all[ $id ] + self::defaults() : null;
	}

	public static function put( string $id, array $g ): void {
		$all        = self::all();
		$all[ $id ] = $g;
		ksort( $all );
		update_option( self::OPTION, $all, true );
	}

	public static function remove( string $id ): void {
		$all = self::all();
		unset( $all[ $id ] );
		update_option( self::OPTION, $all, true );
	}

	/** An id from what was typed: lower case, a-z 0-9 and -, as the relay wants it. */
	public static function slug( string $typed ): string {
		$s = substr( trim( preg_replace( '/[^a-z0-9-]+/', '-', strtolower( remove_accents( $typed ) ) ), '-' ), 0, 63 );
		return preg_match( self::ID, $s ) ? $s : '';
	}

	/**
	 * The settings from the edit form, cleaned: every field typed, bounded, nothing else kept.
	 * Pure apart from WordPress's sanitize helpers, so it is tested on its own.
	 *
	 * @param array $in  The posted fields (already unslashed).
	 * @param array $roles The site's role keys.
	 */
	public static function clean( array $in, array $roles ): array {
		$d    = self::defaults();
		$int  = static fn ( $v, int $min, int $max, int $def ) => is_numeric( $v ) ? max( $min, min( $max, (int) $v ) ) : $def;
		$g    = array(
			'name'        => sanitize_text_field( $in['name'] ?? '' ),
			'description' => sanitize_textarea_field( $in['description'] ?? '' ),
			'lang'        => in_array( $in['lang'] ?? '', array( 'fr', 'en' ), true ) ? $in['lang'] : $d['lang'],
			'welcome'     => sanitize_text_field( $in['welcome'] ?? '' ),
			'tone'        => self::tone( (string) ( $in['tone'] ?? '' ) ),
			'access'      => in_array( $in['access'] ?? '', self::ACCESS, true ) ? $in['access'] : 'admins',
			'roles'       => array_values( array_intersect( array_map( 'sanitize_key', (array) ( $in['roles'] ?? array() ) ), $roles ) ),
			'others'      => in_array( $in['others'] ?? '', array( 'login', 'hide' ), true ) ? $in['others'] : 'login',
			'limits'      => array(),
			'maxQuestion' => $int( $in['maxQuestion'] ?? '', 10, 100000, $d['maxQuestion'] ),
			'maxAnswer'   => $int( $in['maxAnswer'] ?? '', 100, 200000, $d['maxAnswer'] ),
			'answerMin'   => $int( $in['answerMin'] ?? '', 1, 30, $d['answerMin'] ),
			'journal'     => ! empty( $in['journal'] ),
			'journalText' => ! empty( $in['journalText'] ),
		);
		/* A limit row: an empty box means "no limit for that scope"; a row with none is dropped. */
		foreach ( array_slice( (array) ( $in['limits'] ?? array() ), 0, 12 ) as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}
			$l = array(
				'what'   => in_array( $row['what'] ?? '', array( 'questions', 'chars' ), true ) ? $row['what'] : 'questions',
				'window' => in_array( $row['window'] ?? '', array( 'hour', 'day' ), true ) ? $row['window'] : 'hour',
			);
			foreach ( array( 'ip', 'account', 'total' ) as $scope ) {
				$v = trim( (string) ( $row[ $scope ] ?? '' ) );
				$l[ $scope ] = '' === $v || ! is_numeric( $v ) ? '' : max( 0, min( 1000000000, (int) $v ) );
			}
			if ( '' !== $l['ip'] || '' !== $l['account'] || '' !== $l['total'] ) {
				$g['limits'][] = $l;
			}
		}
		return $g;
	}

	/**
	 * The tone: plain text on one line, 300 characters at most (counted as characters, not bytes:
	 * no mbstring needed). It only goes to the engine, as a writing style.
	 */
	public static function tone( string $typed ): string {
		$s = sanitize_text_field( $typed );
		return preg_match( '/^.{0,300}/su', $s, $m ) ? rtrim( $m[0] ) : '';
	}

	/** What the relay is given for a guichet: its own names for the same settings. */
	public static function for_relay( array $g ): array {
		return array(
			'lang'          => $g['lang'],
			'tone'          => (string) $g['tone'],
			'limits'        => $g['limits'],
			'maxQuestion'   => (int) $g['maxQuestion'],
			'maxAnswer'     => (int) $g['maxAnswer'],
			'answerSeconds' => 60 * (int) $g['answerMin'],
			'oneAtATime'    => true,
			'journal'       => (bool) $g['journal'],
			'journalText'   => (bool) $g['journalText'],
		);
	}

	/** The most questions a day the whole guichet takes (for the list's gauge), or 0: no such limit. */
	public static function day_cap( array $g ): int {
		foreach ( $g['limits'] as $l ) {
			if ( 'questions' === $l['what'] && 'day' === $l['window'] && '' !== $l['total'] ) {
				return (int) $l['total'];
			}
		}
		return 0;
	}
}
