<?php

namespace StudySauce\Bundle\EventListener;

use Doctrine\ORM\EntityManager;
use StudySauce\Bundle\Controller\EmailsController;
use Symfony\Bridge\Doctrine\RegistryInterface;
use Symfony\Bundle\FrameworkBundle\Templating\DelegatingEngine;
use Symfony\Bundle\FrameworkBundle\Templating\EngineInterface;
use Symfony\Bundle\FrameworkBundle\Templating\TimedPhpEngine;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\FilterResponseEvent;
use Symfony\Component\HttpKernel\Event\GetResponseForExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Templating\Helper\SlotsHelper;

/**
 * Class RedirectListener
 */
class RedirectListener implements EventSubscriberInterface
{
    /** @var DelegatingEngine $templating */
    protected $templating;

    /** @var  ContainerInterface $kernel */
    protected $container;

    /**
     * @param EngineInterface $templating
     * @param $container
     */
    public function __construct(EngineInterface $templating, $container)
    {
        $this->templating = $templating;
        $this->container = $container;

    }

    /**
     * Returns an array of event names this subscriber wants to listen to.
     *
     * The array keys are event names and the value can be:
     *
     *  * The method name to call (priority defaults to 0)
     *  * An array composed of the method name to call and the priority
     *  * An array of arrays composed of the method names to call and respective
     *    priorities, or 0 if unset
     *
     * For instance:
     *
     *  * array('eventName' => 'methodName')
     *  * array('eventName' => array('methodName', $priority))
     *  * array('eventName' => array(array('methodName1', $priority), array('methodName2'))
     *
     * @return array The event names to listen to
     *
     * @api
     */
    public static function getSubscribedEvents()
    {
        return [
            KernelEvents::RESPONSE => ['onKernelResponse', -128],
            KernelEvents::EXCEPTION => ['onKernelException', -128]
        ];
    }


    /**
     * @param GetResponseForExceptionEvent $event
     */
    public function onKernelException(GetResponseForExceptionEvent $event)
    {
        // provide the better way to display a enhanced error page only in prod environment, if you want
        $exception = $event->getException();
        try {
            /** @var RegistryInterface $doc */
            $doc = $this->container->get('doctrine');
            /** @var EntityManager $orm */
            $orm = $doc->getManager();
            $orm->clear();
            $doc->resetManager();
        }
        catch(\Exception $x) {

        }

        try
        {
            // try to notify admin
            $email = new EmailsController();
            $email->setContainer($this->container);
            $email->administratorAction(null, $exception);
        }
        catch(\Exception $x)
        {
            // nothing more we can do here, hope it gets logged.
        }

        // new Response object
        $response = new Response();

        /** @var Request $request */
        $request = $event->getRequest();

        $this->getAndCleanOutputBuffering($request->headers->get('X-Php-Ob-Level', -1));
        /** @var TimedPhpEngine $engine */
        $engine = $this->templating->getEngine('StudySauceBundle:Exception:error.html.php');
        $engine->set(new SlotsHelper());

        // set response content
        if(empty($request->get('_format')) || $request->get('_format') == 'index')
            $request->attributes->set('_format', 'funnel');

        // HttpExceptionInterface is a special type of exception
        // that holds status code and header details
        if ($exception instanceof HttpExceptionInterface) {
            /** @var HttpException $exception */
            $response->setStatusCode($exception->getStatusCode());
            $response->headers->replace($exception->getHeaders());
            if($this->templating->exists('StudySauceBundle:Exception:error' . $exception->getStatusCode() . '.html.php')) {
                $response->setContent(
                    $this->templating->render('StudySauceBundle:Exception:error' . $exception->getStatusCode() . '.html.php', ['exception' => $exception])
                );
            }
            else {
                $response->setContent(
                    $this->templating->render('StudySauceBundle:Exception:error.html.php', ['exception' => $exception])
                );
            }
        }
        else {
            /** @var \Exception $exception */
            $response->setContent(
                $this->templating->render('StudySauceBundle:Exception:error.html.php', ['exception' => $exception])
            );
            $response->setStatusCode(500);
        }

        // set the new $response object to the $event
        $event->setResponse($response);
    }

    /**
     * @param int     $startObLevel
     *
     * @return string
     */
    private static function getAndCleanOutputBuffering($startObLevel)
    {
        if (ob_get_level() <= $startObLevel) {
            return '';
        }

        Response::closeOutputBuffers($startObLevel + 1, true);

        return ob_get_clean();
    }

    /**
     * @param FilterResponseEvent $event
     */
    public function onKernelResponse(FilterResponseEvent $event)
    {
        $response = $event->getResponse();
        $request = $event->getRequest();

        // always add origin policy
        $response->headers->set('Access-Control-Allow-Origin', 'https://www.youtube.com');

        // TODO: add social login redirect here

        if ($request->isXmlHttpRequest() && $response->isRedirect()) {
            $options = ['redirect' => $response->headers->get('Location')];
            // repopulate the csrf token for login failures
            if(strpos($response->headers->get('Location'), '/login'))
            {
                $csrfToken = $this->container->has('form.csrf_provider')
                    ? $this->container->get('form.csrf_provider')->generateCsrfToken('account_login')
                    : null;
                $options['csrf_token'] = $csrfToken;
            }
            $response->setContent(json_encode($options));
            $response->setStatusCode(200);
            $response->headers->remove('Location');
        }
    }
}