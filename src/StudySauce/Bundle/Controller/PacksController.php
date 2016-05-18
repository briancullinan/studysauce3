<?php

namespace StudySauce\Bundle\Controller;

use Admin\Bundle\Controller\AdminController;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Criteria;
use Doctrine\ORM\EntityManager;
use Doctrine\ORM\QueryBuilder;
use StudySauce\Bundle\Command\CronSauceCommand;
use StudySauce\Bundle\Entity\Answer;
use StudySauce\Bundle\Entity\Card;
use StudySauce\Bundle\Entity\File;
use StudySauce\Bundle\Entity\Group;
use StudySauce\Bundle\Entity\Invite;
use StudySauce\Bundle\Entity\Pack;
use StudySauce\Bundle\Entity\Response;
use StudySauce\Bundle\Entity\User;
use StudySauce\Bundle\Entity\UserPack;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\PreconditionFailedHttpException;
use Symfony\Component\Security\Acl\Exception\Exception;


/**
 * Class BuyController
 * @package StudySauce\Bundle\Controller
 */
class PacksController extends Controller
{
    public function indexAction(Request $request, Pack $pack = null)
    {
        if ($request->get('_route') === 'packs_new') {
            $pack = new Pack();
        }

        return $this->render('AdminBundle:Admin:packs.html.php', ['entity' => $pack]);
    }

    public function groupsAction(Request $request, Group $group = null)
    {
        if ($request->get('_route') === 'groups_new') {
            $group = new Group();
        }

        return $this->render('AdminBundle:Admin:groups.html.php', ['entity' => $group]);
    }

    public function createAction(Request $request)
    {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var User $user */
        $user = $this->getUser();

        /** @var Pack $newPack */
        // process pack settings
        list($newPack) = AdminController::standardSave($request, $this->container);

        // process cards
        // TODO: break this up
        foreach ($request->get('card') ?: [] as $c) {
            /** @var Card $newCard */
            $newCard = $newPack->getCards()->filter(function (Card $x) use ($c) {
                return $c['id'] == $x->getId() && !empty($x->getId());
            })->first();
            // remove cards
            if (!empty($c['remove']) && $c['remove']) {
                if (empty($newCard)) {
                    continue;
                }
                if ($newCard->getResponses()->count() == 0) {
                    foreach ($newCard->getAnswers()->toArray() as $a) {
                        /** @var Answer $a */
                        $orm->remove($a);
                        $newCard->removeAnswer($a);
                    }
                    $orm->remove($newCard);
                    $newPack->removeCard($newCard);
                } else {
                    $newCard->setDeleted(true);
                    $orm->merge($newCard);
                }
                continue;
            }
            else if (empty($newCard)) {
                $newCard = new Card();
                $newCard->setPack($newPack);
                $newPack->addCard($newCard);
            }
            if(isset($c['upload'])) {
                $c['content'] = $c['upload'] . '\n' . $c['content'];
            }
            $newCard->setContent($c['content']);
            if (isset($c['type'])) {
                if ($c['type'] == 'sa exactly' || $c['type'] == 'sa contains') {
                    $newCard->setResponseType('sa');
                }
                else {
                    $newCard->setResponseType($c['type']);
                }
            }
            if (empty($newCard->getId())) {
                $orm->persist($newCard);
            } else {
                $orm->merge($newCard);
            }

            if (!isset($c['answers']) && isset($c['correct'])) {
                $c['answers'] = $c['correct'];
            }
            $answers = explode("\n", isset($c['answers']) ? $c['answers'] : '');
            $answerValues = [];
            foreach ($answers as $a) {
                if (trim($a) == '')
                    continue;
                $newAnswer = $newCard->getAnswers()->filter(function (Answer $x) use ($a) {
                    return trim(trim($a), '$^') == trim(trim($x->getValue()), '$^');
                })->first();
                if (empty($newAnswer)) {
                    $newAnswer = new Answer();
                    $newAnswer->setCard($newCard);
                    $newCard->addAnswer($newAnswer);
                }
                $answerValues[] = $newAnswer;
                $newAnswer->setContent(str_replace('|', ' or ', trim($a)));
                $newAnswer->setResponse(trim($a));
                $newAnswer->setValue(trim($a));
                if (!empty($c['correct'])) {
                    if (strtolower(trim($a)) == strtolower(trim($c['correct']))) {
                        $newAnswer->setCorrect(true);
                    }
                    else if (strpos($c['type'], 'contains') > -1) {
                        $newAnswer->setCorrect(true);
                    }
                    else if (strpos($c['type'], 'exactly') > -1) {
                        $newAnswer->setCorrect(true);
                        $newAnswer->setValue('^' . trim($a) . '$');
                    }
                    else {
                        $newAnswer->setCorrect(false);
                    }
                }
                if (empty($newAnswer->getId())) {
                    $orm->persist($newAnswer);
                } else {
                    $orm->merge($newAnswer);
                }
            }

            // remove missing answers
            foreach ($newCard->getAnswers()->toArray() as $a) {
                /** @var Answer $a */
                if (!in_array($a->getValue(), array_map(function (Answer $x) {
                    return $x->getValue();
                }, $answerValues))
                ) {
                    if ($a->getResponses()->count() == 0) {
                        $newCard->removeAnswer($a);
                        $orm->remove($a);
                    } else {
                        $a->setDeleted(true);
                        $orm->merge($a);
                    }
                }
            }
        }
        $orm->flush();

        // TODO: $shouldNewCards = $newPack->getCards()->filter(function (Card $c) {return !$c->getDeleted();})->count() == 0;
        $searchRequest = unserialize($this->get('cache')->fetch($request->get('requestKey')) ?: 'a:0:{};');
        return $this->forward('AdminBundle:Admin:results', array_merge($searchRequest, [
            'edit' => false,
            'read-only' => ['pack'],
            'new' => false,
            'pack-id' => $newPack->getId(),
            'requestKey' => null,
        ]));
    }

    /**
     * @param null $user
     * @return \StudySauce\Bundle\Entity\Pack[]
     */
    public function getPacksForUser($user = null) {
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        /** @var User $user */
        if ($user == null) {
            $user = $this->getUser();
        }

        return array_values(array_filter($orm->getRepository('StudySauceBundle:Pack')->createQueryBuilder('p')
            ->select('p')
            ->getQuery()
            ->getResult(), function (Pack $p) use ($user) {
            /** @var UserPack $up */
            $hasPack = $p->getUser() == $user
                || $user->getUserPacks()
                    ->filter(function (UserPack $up) use ($p) {
                        return $up->getPack()->getId() == $p->getId();
                    })
                    ->count() > 0
                || $user->getInvites()->exists(function ($_, Invite $x) use ($p) {
                    return !empty($x->getInvitee())
                    && $x->getInvitee()->getUserPacks()->filter(function (UserPack $up) use ($p) {
                        return $up->getPack()->getId() == $p->getId();
                    })
                        ->count() > 0;
                });
            $packGroups = $p->getGroups()->map(function (Group $g) {
                return $g->getId();
            })->toArray();
            $hasGroups = count(array_intersect($packGroups, $user->getGroups()
                    ->map(function (Group $g) {
                        return $g->getId();
                    })->toArray())) > 0
                || $user->getInvites()->exists(function ($_, Invite $x) use ($packGroups) {
                    return !empty($x->getInvitee())
                    && count(array_intersect($packGroups, $x->getInvitee()->getGroups()
                        ->map(function (Group $g) {
                            return $g->getId();
                        })->toArray())) > 0;
                });
            if (($p->getStatus() == 'DELETED' || $p->getStatus() == 'UNPUBLISHED' || empty($p->getStatus()))) {
                if ($hasPack) {
                    return true;
                }
                return false;
            }
            if ($p->getStatus() == 'UNLISTED' && $hasPack) {
                return true;
            }
            if ($p->getStatus() == 'GROUP' && $hasGroups) {
                // || $user->getInvitees()->exists(function ($_, Invite $i) use ($p)
                //    return !empty($i->getUser()) && $i->getUser()->hasGroup($p->getGroup()->getName());
                return true;
            }
            if ($p->getStatus() == 'PUBLIC') {
                return true;
            }
            return false;
        }));
    }

    /**
     * @param User|null $user
     * @return JsonResponse
     */
    public function listAction(User $user = null)
    {

        if(!$this->getUser()->hasRole('ROLE_ADMIN') || $user == null) {
            $user = $this->getUser();
        }
        else {
            // select the parent account so the rest of this works right
            /** @var Invite $parents */
            $parents = $user->getInvitees()->filter(function (Invite $i) { return $i->getUser()->hasRole('ROLE_PARENT');})->first();
            if (!empty($parents)) {
                $user = $parents->getUser();
            }
        }

        /** @var QueryBuilder $qb */
        $packs = self::getPacksForUser($user);
        $response = new JsonResponse(array_map(function (Pack $x) use ($user) {

            $users = $x->getChildUsers($user);

            if ($x->getStatus() == 'DELETED' || $x->getStatus() == 'UNPUBLISHED' || empty($x->getStatus()) || count($users) == 0 || $x->getProperty('schedule') > new \DateTime()) {
                return [
                    'id' => $x->getId(),
                    'deleted' => true
                ];
            }
            // pack should automatically download if user is in group
            return [
                'id' => $x->getId(),
                'logo' => $x->getLogo(),
                'title' => $x->getTitle(),
                'creator' => $x->getCreator(),
                'properties' => $x->getProperties(),
                'created' => $x->getCreated()->format('r'),
                'modified' => !empty($x->getModified()) ? $x->getModified()->format('r') : null,
                'count' => $x->getCards()->filter(function (Card $c) {
                    return !$c->getDeleted();
                })->count(),
                'users' => array_values(array_map(function (User $u) use ($x) {
                    /** @var UserPack $up */
                    $up = $u->getUserPack($x);
                    return [
                        'id' => $u->getId(),
                        'created' => empty($up) || empty($up->getCreated()) ? null : $up->getCreated()->format('r')
                    ];
                }, $users))
            ];
        }, $packs));
        $response->setEncodingOptions($response->getEncodingOptions() | JSON_PRETTY_PRINT);
        return $response;
    }

    public function downloadAction(Request $request, User $user = null)
    {
        /** @var User $user */
        $currentUser = $this->getUser();
        if (empty($user) || !$currentUser->getInvites()->exists(function ($_, Invite $x) use ($user) {
                return $x->getInvitee() == $user;
            })
        ) {
            $user = $currentUser;
        }
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();
        /** @var Pack $pack */
        $pack = $orm->getRepository('StudySauceBundle:Pack')->createQueryBuilder('p')
            ->select('p')
            ->where('p.id=:id')
            ->setParameter('id', intval($request->get('pack')))
            ->getQuery()
            ->getOneOrNullResult();
        if (empty($pack)) {
            throw new NotFoundHttpException("Pack not found");
        }
        /** @var QueryBuilder $qb */
        $cards = $orm->getRepository('StudySauceBundle:Card')->createQueryBuilder('c')
            ->select('c,a')
            ->leftJoin('c.answers', 'a')
            ->where('c.pack=:id')
            ->andWhere('c.deleted = 0 OR c.deleted IS NULL')
            ->setParameter('id', intval($request->get('pack')))
            ->getQuery()
            ->getResult();
        /** @var UserPack $up */
        $up = $user->getUserPackById(intval($request->get('pack')));
        $isNew = false;
        if (empty($up)) {
            $up = new UserPack();
            $up->setUser($user);
            $up->setPack($pack);
            $isNew = true;
        }
        $up->setDownloaded(new \DateTime());
        if ($isNew) {
            $orm->persist($up);
        } else {
            $orm->merge($up);
        }
        $orm->flush();
        return new JsonResponse(array_map(function (Card $x) use ($user) {
            return [
                'id' => $x->getId(),
                'content' => $x->getContent(),
                'response' => $x->getResponseContent(),
                'response_type' => $x->getResponseType(),
                'created' => $x->getCreated()->format('r'),
                'modified' => !empty($x->getModified()) ? $x->getModified()->format('r') : null,
                'answers' => array_values(array_map(function (Answer $a) {
                    return [
                        'id' => $a->getId(),
                        'value' => $a->getValue(),
                        'content' => $a->getContent(),
                        'correct' => $a->getCorrect(),
                        'created' => $a->getCreated()->format('r'),
                        'modified' => !empty($a->getModified()) ? $a->getModified()->format('r') : null
                    ];
                }, $x->getAnswers()->filter(function (Answer $a) {
                    return !$a->getDeleted();
                })->toArray())),
                'responses' => []
            ];
        }, $cards));
    }

    public function responsesAction(Request $request, User $user)
    {
        /** @var User $currentUser */
        $currentUser = $this->getUser();

        if (empty($user) || (!$currentUser->getInvites()->exists(function ($_, Invite $x) use ($user) {
                return $x->getInvitee() == $user;
            }) && !$currentUser->hasRole('ROLE_ADMIN')))
        {
            $user = $currentUser;
        }
        /** @var $orm EntityManager */
        $orm = $this->get('doctrine')->getManager();

        $responses = $request->get('responses') ?: [];
        if (!empty($request->get('pack')) && !empty($request->get('card')) && !empty($request->get('answer'))
            && !empty($request->get('correct')) && !empty($request->get('created'))
        ) {
            $responses[] = [
                'pack' => $request->get('pack'),
                'card' => $request->get('card'),
                'answer' => $request->get('answer'),
                'correct' => $request->get('correct'),
                'created' => $request->get('created'),
                'user' => $currentUser
            ];
        }
        /** @var [UserPack] $userPacks */
        $result = [];
        foreach ($responses as $r) {

            /** @var Card $card */
            $card = $orm->getRepository('StudySauceBundle:Card')->createQueryBuilder('c')
                ->select('c')
                ->where('c.id=:id')
                ->setParameter('id', intval($r['card']))
                ->getQuery()
                ->getOneOrNullResult();
            if (empty($card)) {
                $result[] = null;
                continue;
            }

            $response = new Response();
            $response->setUser($user);
            $user->addResponse($response);
            $response->setCard($card);
            $card->addResponse($response);
            $response->setCreated(date_timezone_set(new \DateTime($r['created']), new \DateTimeZone(date_default_timezone_get())));
            $response->setCorrect($r['correct'] == '1' || $r['correct'] == 'true');
            if (!empty($r['answer'])
                && !empty($a = $card->getAnswers()->filter(function (Answer $a) use ($r) {
                    return $a->getId() == intval($r['answer']);
                })->first())
            ) {
                $response->setAnswer($a);
            }
            $orm->persist($response);
            $result[] = $response;
        }
        $orm->flush();

        $since = 0;
        if (!empty($request->get('since'))) {
            $since = intval($request->get('since'));
        }
        // only sync responses for specific pack
        $packs = self::getPacksForUser($currentUser);
        $packs = array_filter($packs, function (Pack $x) {return !($x->getStatus() == 'DELETED' || $x->getStatus() == 'UNPUBLISHED' || empty($x->getStatus()) || $x->getProperty('schedule') > new \DateTime());});
        if (!empty($request->get('pack'))) {
            $packs = array_values(array_filter($packs, function (Pack $p) use ($user, $currentUser, $request) {return $p->getId() == intval($request->get('pack')) && in_array($user, $p->getChildUsers($currentUser));}));
            $retention = self::getRetention($packs[0], $user);
        }
        else {
            $packs = array_values(array_filter($packs, function (Pack $p) use ($user, $currentUser, $request) {return in_array($user, $p->getChildUsers($currentUser));}));
            $retention = array_values(array_map(function (Pack $p) use ($user) {return ['id' => $p->getId(), 'retention' => self::getRetention($p, $user)];}, $packs));
        }

        $ids = array_map(function ($r) {
            /** @var Response $r */
            return empty($r) ? null : $r->getId();
        }, $result);

        return new JsonResponse(['ids' => $ids, 'retention' => $retention]);
    }

    /**
     * @param Pack $pack
     * @param User $user
     * @return mixed
     */
    public static function getRetention(Pack $pack, User $user) {
        $intervals = [1, 2, 4, 7, 14, 28, 28 * 3, 28 * 6, 7 * 52];
        // if a card hasn't been answered, return the next card
        $cards = $pack->getCards()->filter(function (Card $c) {return !$c->getDeleted();})->toArray();
        $responses = $user->getResponsesForPack($pack);
        $result = [];
        foreach($cards as $c) {
            /** @var Card $c */
            /** @var Response[] $cardResponses */
            $cardResponses = $responses->matching(Criteria::create()->where(Criteria::expr()->eq('card', $c)))->toArray();
            usort($cardResponses, function (Response $r1, Response $r2) {return $r1->getCreated()->getTimestamp() - $r2->getCreated()->getTimestamp();});
            /** @var \DateTime $last */
            $last = null;
            $i = 0;
            $correctAfter = false;
            $max = null;
            foreach($cardResponses as $r) {
                if ($r->getCorrect()) {
                    // If it is in between time intervals ignore the response
                    while ($i < count($intervals) && ($last == null || date_time_set(clone $r->getCreated(), 3, 0, 0) >= date_time_set(date_add(clone $last, new \DateInterval('P' . $intervals[$i] . 'D')), 3, 0, 0))) {
                        // shift the time interval if answers correctly in the right time frame
                        $last = $r->getCreated();
                        $i += 1;
                    }
                    $correctAfter = true;
                }
                else {
                    $i = 0;
                    $last = $r->getCreated();
                    $correctAfter = false;
                }
                $max = $r->getCreated();
            }
            if ($i < 0) {
                $i = 0;
            }
            if ($i > count($intervals) - 1) {
                $i = count($intervals) - 1;
            }
            $result[$c->getId()] = [
                // interval value
                $intervals[$i],
                // last interval date
                !empty($last) ? $last->format('r') : null,
                // should display on home screen
                empty($last) || ($i == 0 && !$correctAfter) || date_add(date_time_set(clone $last, 3, 0, 0), new \DateInterval('P' . $intervals[$i] . 'D')) <= date_time_set(new \DateTime(), 3, 0, 0),
                // last response date for card, used for counting
                empty($max) ? null : $max->format('r')
            ];
        }
        return $result;
    }
}
