<?php
/**
 * Deleting the plugin deletes its settings and, when they are under uploads, its files (threads,
 * tokens, journal). A GUICHET_DATA_DIR set in wp-config.php is left alone: the site chose it.
 *
 * @package Guichet
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

$guichet_key = get_option( 'guichet_dir_key' );
if ( is_string( $guichet_key ) && preg_match( '/^[a-f0-9]{16}$/', $guichet_key ) ) {
	$guichet_dir = wp_upload_dir( null, false )['basedir'] . '/guichet-' . $guichet_key;
	if ( is_dir( $guichet_dir ) ) {
		$guichet_files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $guichet_dir, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST );
		foreach ( $guichet_files as $guichet_file ) {
			$guichet_file->isDir() ? rmdir( $guichet_file->getPathname() ) : wp_delete_file( $guichet_file->getPathname() ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		}
		rmdir( $guichet_dir ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	}
}
delete_option( 'guichet_guichets' );
delete_option( 'guichet_dir_key' );
