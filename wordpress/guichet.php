<?php
/**
 * Plugin Name:       Guichet
 * Description:       An assistant that answers your visitors from your documents, and can do nothing else. Several guichets, each with its audience, limits and engine tokens; the engine connects out to your site.
 * Version:           0.1.2
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            tuxo83
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       guichet
 * Domain Path:       /languages
 *
 * @package Guichet
 */

defined( 'ABSPATH' ) || exit;

define( 'GUICHET_VERSION', '0.1.2' );
define( 'GUICHET_FILE', __FILE__ );
define( 'GUICHET_DIR', plugin_dir_path( __FILE__ ) );
define( 'GUICHET_URL', plugin_dir_url( __FILE__ ) );

require_once GUICHET_DIR . 'includes/vendor/GuichetRelay.php';
require_once GUICHET_DIR . 'includes/class-guichet-store.php';
require_once GUICHET_DIR . 'includes/class-guichet-plugin.php';
require_once GUICHET_DIR . 'includes/class-guichet-rest.php';
require_once GUICHET_DIR . 'includes/class-guichet-front.php';
if ( is_admin() ) {
	require_once GUICHET_DIR . 'includes/class-guichet-admin.php';
}

register_activation_hook( __FILE__, array( 'Guichet_Plugin', 'activate' ) );
Guichet_Plugin::boot();
