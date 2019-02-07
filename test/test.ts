/// <reference path="../index.d.ts" />
import * as fs from 'fs'
import * as path from 'path'
const QR = require( '../index' );

let DEBUG = false;
let TESTS: string[] = [];
for ( let i = 2 ; i < process.argv.length ; ++i )
{
	switch ( process.argv[ i ] )
	{
		case '--debug':
		case '-d':
			DEBUG = true; break;
		default:
			TESTS.push( process.argv[ i ] );
	}
}

function Readdir( dir: string, dironly: boolean )
{
	return new Promise<string[]>( ( resolve, reject ) =>
	{
		fs.readdir( dir, ( error, files ) =>
		{
			if ( error ) { return reject( error ); }
			resolve( files );
		} );
	} ).then( ( files ) =>
	{
		return files.map( ( f ) => { return path.join( dir, f ); } ).filter( ( file ) =>
		{
			const stat = fs.statSync( file );
			return stat.isDirectory() === dironly;
		} );
	} );
}


function ReadText( file: string )
{
	return new Promise<string>( ( resolve, reject ) =>
	{
		fs.readFile( file, 'utf8', ( error, file ) =>
		{
			if ( error ) { return reject( error ); }
			resolve( file );
		} );
	} );
}

function ReadFile( file: string )
{
	return new Promise<Buffer>( ( resolve, reject ) =>
	{
		fs.readFile( file, ( error, file ) =>
		{
			if ( error ) { return reject( error ); }
			resolve( file );
		} );	
	} ).then( ( buffer ) =>
	{
		const array: number[] = [];
		for ( let i = 0 ; i < buffer.length ; ++i ) { array.push( buffer[ i ] ); }
		return array;
	} );
}

function CompareBitmap( src: number[], qr: number[] )
{
	if ( src.length !== qr.length ) { return false; }
	if ( DEBUG )
	{
		let ans = true;
		for ( let i = 0 ; i < src.length ; ++i )
		{
			if ( src[ i ] !== qr[ i ] ) { ans = false; console.log( i, src[ i ], qr[ i ] ); }
		}
		return ans;
	} else
	{
		for ( let i = 0 ; i < src.length ; ++i )
		{
			if ( src[ i ] !== qr[ i ] ) { return false; }
		}
	}
	return true;
}

async function RunTest( dir: string )
{
	const result = { generation: false, message: '', dir: dir, level: '', version: 0, score: [ 0 ], select: -1, answer: -1 };
	const data = await ReadText( path.join( dir, 'test.txt' ) );
	const sample = await ReadFile( path.join( dir, 'sample.bmp' ) );
	const [ num, ver, level ] = dir.split( '_' );

	const qr = <QRLite.Generator>new QR.Generator();
	result.level = qr.setLevel( <'L'|'M'|'Q'|'H'>level );
	
	const rawdata = qr.setData( data );
	result.version = qr.getVersion();
	//console.log( rawdata );
	// [ 0 ] = Data block, [ 1 ] = EC Block
	const datacode = qr.createDataCode();
	//console.log( datacode[ 0 ] );
	qr.drawData( datacode[ 0 ], datacode[ 1 ] );

	const masked = qr.createMaskedQRCode();
	result.score = qr.evaluateQRCode( masked );
	result.select = qr.selectQRCode( masked );

	// Debug output. Raw QR code.
	fs.writeFileSync( path.join( dir, 'qr_.bmp' ), Buffer.from( qr.get().outputBitmapByte( 0 ) ) );

	//console.log( 'sample:',sample );
	masked.forEach( ( qr, index ) =>
	{
		if ( DEBUG ) { console.log( 'Mask:', index ); }
		const compare = CompareBitmap( sample, qr.outputBitmapByte( 0 ) );
		// Debug output.
		fs.writeFileSync( path.join( dir, 'qr_' + index + '.bmp' ), Buffer.from( qr.outputBitmapByte( 0 ) ) );
		if ( compare ) { result.answer = index; }
		result.generation = result.generation || compare;
	} );

	// Add message.
	if ( result.select !== result.answer ) { result.message = 'Did not choose the correct answer.'; }
	if ( result.answer < 0 ) { result.message = 'Wrong answer.'; }

	return result;
}

async function Main( base = './test/' )
{
	const dirs = 0 < TESTS.length ? TESTS.map( ( d ) => { return path.join( base, d ); } ) : await Readdir( base, true );
	for ( let i = 0 ; i < dirs.length ; ++i )
	{
		const result = await RunTest( dirs[ i ] );
		if ( !result.generation ) { throw [ 'Error: ', result.dir, '|', result.version, result.level, '|', result.select, result.answer, result.message ].join( ' ' ); }
		console.log( result.message ? 'Wargning:' : 'Success!:', result.dir, '|', result.version, result.level, '|', result.select, result.answer, result.score, result.message );
	}
}

Main().then( () => { console.log( 'Complete.' ); } ).catch( ( error ) => { console.error( error ); } );
