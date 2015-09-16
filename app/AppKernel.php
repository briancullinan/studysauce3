<?php

use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Config\Loader\LoaderInterface;

class AppKernel extends Kernel
{
    public function registerBundles()
    {
        $print = "before bundles";
        $bundles = [
            new Symfony\Bundle\FrameworkBundle\FrameworkBundle(),
            new Symfony\Bundle\SecurityBundle\SecurityBundle(),
            new Symfony\Bundle\TwigBundle\TwigBundle(),
            new Symfony\Bundle\MonologBundle\MonologBundle(),
            new Symfony\Bundle\SwiftmailerBundle\SwiftmailerBundle(),
            new Symfony\Bundle\AsseticBundle\AsseticBundle(),
            new Doctrine\Bundle\DoctrineBundle\DoctrineBundle(),
            new Sensio\Bundle\FrameworkExtraBundle\SensioFrameworkExtraBundle(),
        ];
        $bundles[] = new FOS\UserBundle\FOSUserBundle();
        $bundles[] = new HWI\Bundle\OAuthBundle\HWIOAuthBundle();
        $bundles[] = new StudySauce\Bundle\StudySauceBundle();
        $bundles[] = new Course1\Bundle\Course1Bundle();
        $bundles[] = new Course2\Bundle\Course2Bundle();
        $bundles[] = new Course3\Bundle\Course3Bundle();
        $bundles[] = new WhiteOctober\SwiftMailerDBBundle\WhiteOctoberSwiftMailerDBBundle();
        $bundles[] = new TorchAndLaurel\Bundle\TorchAndLaurelBundle();
        $bundles[] = new Admin\Bundle\AdminBundle();

        if (in_array($this->getEnvironment(), ['dev', 'test'])) {
            $bundles[] = new Symfony\Bundle\WebProfilerBundle\WebProfilerBundle();
            $bundles[] = new Sensio\Bundle\DistributionBundle\SensioDistributionBundle();
            $bundles[] = new Sensio\Bundle\GeneratorBundle\SensioGeneratorBundle();
        }

        return $bundles;
    }

    public function registerContainerConfiguration(LoaderInterface $loader)
    {
        $loader->load(__DIR__.'/config/config_'.$this->getEnvironment().'.yml');
    }
}
