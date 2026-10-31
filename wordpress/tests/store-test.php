<?php
/* The settings form's cleaning and the relay's view of it, without WordPress: its few helpers are
 * stubbed below as WordPress defines them for these inputs.   php tests/store-test.php */
define( 'ABSPATH', __DIR__ );
function sanitize_text_field( $s ) { return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $s ) ) ); }
function sanitize_textarea_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function sanitize_key( $s ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) ); }
function remove_accents( $s ) { return strtr( $s, array( 'é' => 'e', 'è' => 'e', 'à' => 'a', 'ç' => 'c', 'ô' => 'o' ) ); }
function get_locale() { return 'fr_FR'; }
require __DIR__ . '/../includes/vendor/GuichetRelay.php';
require __DIR__ . '/../includes/class-guichet-store.php';

$failed = 0; $n = 0;
function same( $got, $want, string $what ): void {
	global $failed, $n; $n++;
	if ( $got === $want ) { echo "ok $n - $what\n"; return; }
	$failed++; echo "not ok $n - $what\n  got:  " . json_encode( $got ) . "\n  want: " . json_encode( $want ) . "\n";
}

$roles = array( 'subscriber', 'contributor', 'author', 'editor', 'administrator' );
$d = Guichet_Store::defaults();
same( array_map( fn ( $l ) => array( $l['window'], $l['ip'], $l['account'], $l['total'] ), $d['limits'] ), array( array( 'hour', 10, 30, 300 ), array( 'day', 40, 100, 500 ), array( 'day', 60000, 150000, 2000000 ) ), 'default limits: 10/30/300 an hour, 40/100/500 a day, volume a day' );
same( array( $d['maxQuestion'], $d['maxAnswer'], $d['answerMin'], $d['access'], $d['journal'] ), array( 2000, 8000, 3, 'admins', false ), 'defaults: 2000 / 8000 characters, 3 minutes, admins only, no journal' );

$g = Guichet_Store::clean( array(
	'name' => ' Le <b>Sage</b> ', 'tone' => " à la manière de <i>Yoda</i>\n, parchemins " . str_repeat( 'é', 400 ), 'lang' => 'xx', 'access' => 'root', 'roles' => array( 'editor', 'nope', 'Author' ), 'others' => 'hide',
	'maxQuestion' => '999999', 'maxAnswer' => 'abc', 'answerMin' => '0', 'journal' => '1',
	'limits' => array(
		array( 'what' => 'chars', 'window' => 'week', 'ip' => ' 12 ', 'account' => '', 'total' => '-5' ),
		array( 'what' => 'questions', 'window' => 'day', 'ip' => '', 'account' => '', 'total' => '' ),
		'junk',
	),
), $roles );
same( $g['name'], 'Le Sage', 'markup stripped from the name' );
same( array( $d['tone'], Guichet_Store::for_relay( $d )['tone'] ), array( '', '' ), 'no tone by default: the engine stays neutral' );
same( $g['tone'], 'à la manière de Yoda , parchemins ' . str_repeat( 'é', 266 ), 'the tone: plain text, one line, 300 characters at most' );
same( Guichet_Store::for_relay( $g )['tone'], $g['tone'], 'the tone goes to the relay' );
same( array( $g['lang'], $g['access'], $g['others'] ), array( 'fr', 'admins', 'hide' ), 'unknown language and access fall back' );
same( $g['roles'], array( 'editor', 'author' ), 'only the site\'s roles are kept' );
same( array( $g['maxQuestion'], $g['maxAnswer'], $g['answerMin'] ), array( 100000, 8000, 1 ), 'numbers bounded; not a number: the default' );
same( $g['limits'], array( array( 'what' => 'chars', 'window' => 'hour', 'ip' => 12, 'account' => '', 'total' => 0 ) ), 'a limit row cleaned; an empty row dropped' );
same( array( $g['journal'], $g['journalText'] ), array( true, false ), 'journal ticked, text not' );
same( Guichet_Store::for_relay( $g )['answerSeconds'], 60, 'minutes become the relay\'s seconds' );
same( Guichet_Store::for_relay( $g )['oneAtATime'], true, 'one question at a time, always' );
same( Guichet_Store::day_cap( $d ), 500, 'the daily cap of the list\'s gauge' );
same( array( Guichet_Store::slug( 'Le Sage du Phare !' ), Guichet_Store::slug( '---' ), Guichet_Store::slug( 'Opérations' ) ), array( 'le-sage-du-phare', '', 'operations' ), 'identifiers from what was typed' );

/* The relay with these settings: the default limits hold per address, per account, per guichet. */
$dir = sys_get_temp_dir() . '/guichet-store-test-' . bin2hex( random_bytes( 4 ) );
$relay = new GuichetRelay( array( 'dir' => $dir, 'timezone' => 'UTC', 'pollSeconds' => 0, 'guichets' => fn ( $id ) => 'help' === $id ? Guichet_Store::for_relay( $d ) : null ) );
$t = $relay->createToken( 'help', 'test' );
$relay->respond( 'POST', '/help/engine/poll', array( 'token' => $t['token'], 'body' => array() ) ) ?? null;
$codes = array();
for ( $i = 0; $i < 11; $i++ ) {
	$out = $relay->respond( 'POST', '/help/say', array( 'who' => array( 'id' => "u:$i" ), 'ip' => 'address-a', 'body' => array( 'text' => "q$i" ) ) );
	$codes[] = $out[0];
}
same( array_count_values( $codes ), array( 200 => 10, 429 => 1 ), 'the 11th question from one address in an hour is refused' );
same( array( $out[1]['scope'], $out[1]['used'], $out[1]['max'] ), array( 'ip', 10, 10 ), '429 says which limit, how much used, the most' );
same( $relay->respond( 'POST', '/help/say', array( 'who' => array( 'id' => 'u:0' ), 'ip' => 'address-b', 'body' => array( 'text' => 'again' ) ) )[0], 429, 'one question at a time per person' );
same( $relay->status( 'help' )['today']['asked'], 10, 'today\'s count for the State panel' );
same( $relay->status( 'help' )['tokens'], 1, 'active tokens for the State panel' );
$relay->forget( 'help' );
same( is_dir( "$dir/guichets/help" ), false, 'a deleted guichet leaves no file' );

echo $failed ? "# $failed of $n failed\n" : "# all $n passed\n";
exit( $failed ? 1 : 0 );
