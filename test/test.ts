/// <reference path="../index.d.ts" />
import * as fs from 'fs'
import * as path from 'path'
const QR = require( '../index' );

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
	for ( let i = 0 ; i < src.length ; ++i )
	{
		if ( src[ i ] !== qr[ i ] ) { return false; }
	}
	return true;
}

async function RunTest( dir: string )
{
	const data = await ReadText( path.join( dir, 'test.txt' ) );
	const sample = await ReadFile( path.join( dir, 'sample.bmp' ) );
	const [ num, ver, level ] = dir.split( '_' );

	const qr = <QRLite.Generator>new QR.Generator();
	const newlevel = qr.setLevel( <'L'|'M'|'Q'|'H'>level );
	console.log( 'Start:', dir, newlevel, data );
	
	const rawdata = qr.setData( data );
	//console.log( rawdata );
	// [ 0 ] = Data block, [ 1 ] = EC Block
	const datacode = qr.createDataCode();
	//console.log( datacode[ 0 ] );
	qr.drawData( datacode[ 0 ], datacode[ 1 ] );

	const masked = qr.createMaskedQRCode();
	console.log( qr.evaluateQRCode( masked ) );
	const masknum = qr.selectQRCode( masked );

	// Debug output. Raw QR code.
	fs.writeFileSync( path.join( dir, 'qr_.bmp' ), Buffer.from( qr.get().outputBitmapByte( 0 ) ) );

	//console.log( 'sample:',sample );
	let answer = false;
	let mask = -1;
	masked.forEach( ( qr, index ) =>
	{
		const compare = CompareBitmap( sample, qr.outputBitmapByte( 0 ) );
		// Debug output.
		fs.writeFileSync( path.join( dir, 'qr_' + index + '.bmp' ), Buffer.from( qr.outputBitmapByte( 0 ) ) );
		if ( compare ) { mask = index; }
		answer = answer || compare;
	} );
	console.log( 'End:', dir, 'Mask:' + mask );

	return answer;
}

async function Main( base = './test/' )
{
	const dirs = await Readdir( base, true );
	console.log( dirs );
	for ( let i = 0 ; i < dirs.length ; ++i )
	{
		const result = await RunTest( dirs[ i ] );
		if ( !result ) { throw 'Error: ' + dirs[ i ]; }
	}
}

Main().then( () => { console.log( 'Complete.' ); } ).catch( ( error ) => { console.error( error ); } );
