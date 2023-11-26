<?php
if (isset($_GET['word']) && isset($_GET['type']) && ($_GET['type']=='good' || $_GET['type']=='bad')) {
    echo("params ok\n");
    if (strlen($_GET['word'])>=4 && strlen($_GET['word'])<=8) {
        $filename = $_GET['type'].".txt";
        echo("Saving ".$_GET['word']." into $filename\n");
        $file = fopen($filename,'a');
        fwrite($file, $_GET['word']."\n");
        fclose($file);
    }
}
?>
OK