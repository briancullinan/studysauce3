<?php
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Pack;
use StudySauce\Bundle\Entity\User;

/** @var Pack $pack */
$time = method_exists($pack, 'getModified') && !empty($pack->getModified()) ? $pack->getModified() : $pack->getCreated();
?>
<a href="#upload-image" data-target="#upload-file" data-toggle="modal" class="pack-icon cloak">
    <?php if (empty($pack->getLogo())) {
        foreach ($view['assetic']->image(['@StudySauceBundle/Resources/public/images/upload_image.png'], [], ['output' => 'bundles/studysauce/images/*']) as $url): ?>
            <img width="300" height="100" src="<?php echo $view->escape($url) ?>" class="default centerized" alt="Upload"/>
        <?php endforeach;
    } else { ?><img height="50" src="<?php print $pack->getLogo(); ?>" /><?php } ?>
    <br />
    <span class="reveal"> Image</span>
</a>