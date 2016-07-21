<?php

/**
 * Created by PhpStorm.
 * User: fregini
 * Date: 20/07/16
 * Time: 16:23
 */
class Engines_MyMemory_TempGlossaryFile {

    /**
     * @var string file name
     */
    public $name ;

    /**
     * @var SplFileObject
     */
    public $fileLink ;

    public $postResult ; 

    public function __construct($filename, $count) {

        $prefix = "$filename-$count-";
        $this->name = tempnam( "/tmp", $prefix ) ;
        $this->fileLink = new SplFileObject( $this->name, 'r+' );
        $this->fileLink->setFlags( SplFileObject::READ_CSV | SplFileObject::SKIP_EMPTY | SplFileObject::READ_AHEAD );

    }

}