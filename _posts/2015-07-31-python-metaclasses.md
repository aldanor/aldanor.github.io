---
layout: post
title: Python metaclasses
description: |
    A brief excurse into Python metaclasses outlining the common use cases, notable differences
    in Python 2.x/3.x syntax and providing a few examples.
tags:
- python
- meta
cover_img: http://imgs.xkcd.com/comics/meta-analysis.png
cover_url: https://xkcd.com/1447
---

Same way as classes control instance creation and let us define instance behaviour in
the form of instance methods and magic methods, *metaclasses* in Python can do all that
and a little more for class objects. The simplest way to deal with metaclasses is to
think of them as of *classes of classes*.

<!--more-->

One of the most commonly used metaclasses is
[`type`](https://docs.python.org/3/library/functions.html#type)
since it's a default metaclass for all classes, and all other metaclasses have to derive from it.

## Contents
{:.no_toc}

* TOC
{:toc}

## Type of a type

In Python, everything is an object and every object needs to have a *type*. In a nutshell,
a type is an entity that knows how to create instances, with optional bells and whistles on
top. For instance, the type of `1` is `int` and the type of `int` is `type`:

{% highlight python %}
assert type(1) is int
assert type(int) is type
{% endhighlight %}
{:.line-numbers}

There's the [`types`](https://docs.python.org/3/library/types.html) module in the standard library
that provides a few functions that manipulate types and defines the standard types used by
the interpreter. This comes in handy, say, if you need to check whether a given object is
a function or a module:

{% highlight python %}
import types

def func():
    pass

assert isinstance(func, types.FunctionType)
assert isinstance(types, types.ModuleType)
{% endhighlight %}

Now, since `type` is also an object, what about its type? It turns out that `type`'s type is the
`type` itself, so that's as far up the type ladder as it goes:

{% highlight python %}
assert type(type) is type
{% endhighlight %}

The type of all new-style user-defined classes is also `type`:

{% highlight python %}
class A(object):
    pass

assert type(A) is type
{% endhighlight %}

You sort of get that for free in Python 3, but in Python 2 you have to remember to derive all
your classes from `object`, otherwise they end up being of `classobj` type:

{% highlight python %}
# Python 2.x
class B:
    pass

# let's just leave it at that
assert type(B) is not type
{% endhighlight %}

Finally, when called with three arguments, `type` acts like a constructor, so you can create
new types in an inline fashion. The arguments are: the name of the type, the tuple of base
classes and the class dict (which contains everything you would normally put in the class body):

{% highlight python %}
class A(object):
    pass

def f(self, x):
    return x + 1

Type = type('Type', (A,), {'x': 42, 'f': f})
instance = Type()

assert issubclass(Type, A)
assert isinstance(instance, Type)
assert Type.x == 42
assert instance.f(1) == 2
{% endhighlight %}

We'll get back to this a bit later when we look at the metaclass constructor.

## Attaching metaclasses

Since all metaclasses inherit from `type`, the simplest implementation of a metaclass
looks like this:

{% highlight python %}
class M(type):
    pass
{% endhighlight %}

Any class whose metaclass is `M` will now be of type `M` (but also an instance of `type` since `M`
derives from `type`).

How do we attach the metaclass to a class? Alas, this is yet another
thing that's done differently in Python 2 and Python 3.

In Python 2, the metaclass is attached by setting a special field in the class body:

{% highlight python %}
# Python 2.x only
class A(object):
    __metaclass__ = M
{% endhighlight %}

In Python 3, however, the metaclass has to be specified as a keyword argument in the base
class list:

{% highlight python %}
# Python 3.x only
class A(object, metaclass=M):
    pass
{% endhighlight %}

One of the ways to get around this is to use the [`six`](https://pypi.python.org/pypi/six)
compatibility library which provides a unified way of attaching metaclasses either through
a decorator or a special base class:

{% highlight python %}
# Python 2 and 3
import six

# metaclass
class M(type):
    pass

# base class
class A(object):
    pass

class B(six.with_metaclass(M, A)):
    pass

@six.add_metaclass(M)
class C(A):
    pass

assert issubclass(B, A)
assert type(B) is M

assert issubclass(C, A)
assert type(C) is M
{% endhighlight %}

## Intercepting type constructors

As we've already seen above, `type`'s constructor signature looks like this:

{% highlight python %}
type(name, bases, clsdict)
{% endhighlight %}

Defining classes using the `class` keyword can be just viewed as a syntactic sugar for
calling `type`'s constructor directly (for the most part, anyway).

{% highlight python %}
class A(object):
    x = 1

class B(A):
    y = 2

    @classmethod
    def f(cls, v):
        return v + 1

    def g(self, v):
        return v + 2
{% endhighlight %}

By using `type` directly, the example above could be rewritten like so:

{% highlight python %}
clsdict_a = {
    'x': 1
}

A = type('A', (object,), clsdict_a)

def f(cls, v):
    return v + 1

def g(self, v):
    return v + 2

clsdict_b = {
    'y': 2,
    'f': classmethod(f),
    'g': g
}

B = type('B', (A,), clsdict_b)
{% endhighlight %}

All the real magic is happening in the constructor of `type`, and user-defined metaclasses
can alter the arguments that it receives. In other words, you can intercept class creation right
after the class definition was parsed by interpreter and right before it gets passed on to `type`.
This can be done by overriding the `__new__` method.

Let's look at a specific example where we want all subclasses of a certain class to be assigned
automatically incremented ids only if the `track` field is set to a truthy value in the class
body.

{:.line-numbers}

{% highlight python %}
import six

class Meta(type):
    _counter = 0

    def __new__(meta, name, bases, clsdict):
        clsdict['id'] = None
        if clsdict.pop('track', False):
            clsdict['id'] = meta._counter
            meta._counter += 1
        return super(Meta, meta).__new__(meta, name, bases, clsdict)

class Trackable(six.with_metaclass(Meta)):
    pass

assert Trackable._counter == 0
assert M._counter == 0
assert Trackable.id is None

class A(Trackable):
    track = True

assert A._counter == 1
assert A.id == 0
assert not hasattr(A, 'track')

class B(A):
    pass

assert B._counter == 1
assert B.id is None

class C(Trackable):
    track = True

assert C._counter == 2
assert C.id == 1
{% endhighlight %}

First we define the metaclass `Meta` as a subclass of `type` that overrides its `__new__`
method and contains a class-level variable `_counter` that encapsulates the state.

The signature of `__new__` matches the signature of the `type` constructor, and it receives the
class name, a tuple of base types and a class dict. In this method, we check if the class dict
has a `track` field and whether it's set to a truthy value; if it does, we assign the current
counter value to a class-level `id` field and increase the counter, otherwise the `id` is set
to `None`. Note that the `track` key is removed from the class dict if it exists.

Finally, we call the the constructor of the base metaclass to instantiate the type and then we
return it (note that we could have used `type.__new__` instead of `super(Meta, meta).__new__`
but it's generally considered a good habit to avoid hard-coding the base type which may
sometimes lead to unexpected inheritance behaviour).

Note that all the class-level variables in the metaclass such as `_counter` in our case can be
accessed by the underlying classes and instances. Same way, instance methods of the metaclass
are available as class methods and can be accessed by both classes and instances.

## Metaclass as a registry

One of the typical use cases for metaclasses is to keep track of the created classes in
order to be able to access them at runtime by name or identifier.

{:.line-numbers}

{% highlight python %}
import six

class RegistryMeta(type):
    def __getitem__(meta, key):
        return meta._registry[key]

@six.add_metaclass(RegistryMeta)
class Registry(type):
    _registry = {}

    def __new__(meta, name, bases, clsdict):
        cls = super(Registry, meta).__new__(meta, name, bases, clsdict)
        if not clsdict.pop('__base__', False):
            meta._registry[name] = cls
            if 'alias' in clsdict:
                meta._registry[cls.alias] = cls
        return cls

class Base(six.with_metaclass(Registry)):
    __base__ = True

class A(Base):
    pass

class B(Base):
    alias = 'foo'

assert Registry['A'] is A  # lookup by class name
assert Registry['B'] is B
assert Registry['foo'] is B  # or by alias

# Base is not in registry
try:
    Registry['Base']
except Exception as e:
    assert isinstance(e, KeyError)
{% endhighlight %}

In this example, any subclass of `Base` (whether direct or indirect) will be tracked by
the `Registry` metaclass, and can be retrieved at a later time via the class name or the
`alias` field if it's provided.

We didn't want the `Base` class itself to appear in the class registry, but rather its strict
descendants only – so we check whether the class body has `__base__` field defined, and don't
register it with the metaclass if it does.

In order to make the `Registry` metaclass subscriptable, we've had to attach `RegistryMeta`
metaclass to it in which we've implemented `__getitem__` magic method. As scary as
"metaclass of a metaclass" may sound, it follows the same logic as if you were implementing
a magic method for instances in the class body – if you need the instance (which also happens
to be a metaclass in our case) to do something fancy, you implement it in its type so the
type knows how to attach that fancy functionality to the object at creation time.

To summarize the type/metaclass hierarchy in the example above:

{% highlight python %}
a = A()
assert type(a) is A
assert type(A) is Registry
assert type(Registry) is RegistryMeta
assert type(RegistryMeta) is type
{% endhighlight %}

## Singleton pattern

Using global "god objects" is generally a bad idea, but if you absolutely have to – you may want
to make sure it is actually a singleton. That is, only one unique instance of the class can
exist at a time, and the class cannot be inherited from (or, in Java terms, it is *final*).

As we've already seen, if a metaclass is attached to the base class, every time the base
class is directly or indirectly subclassed the `__new__` method of the metaclass will be called.
This lets us easily handle the no-inheritance part. Well, almost, since we could subclass the
metaclass itself, attach it to a new base type and derive that class from the original singleton.
If for some reason you would want to prevent that from happening, you could implement a metaclass
for the metaclass in order to make the metaclass "final". However, then one could subclass the
metaclass's metaclass... you get [the point](https://xkcd.com/1447).

When it comes to controlling instance creation from the metaclass, `__new__` is no longer
sufficient – we need to override `__call__` instead. An easy way to remember this:
`__new__` is triggered when a *new* class is created; `__call__` is triggered when a new
instance is created via the *call*-like syntax on the class object. This works the same way as
when `__new__` and `__call__` magic methods are implemented on normal classes, with the former
controlling instance creation and the latter making instances callable.

To see how these methods work together, take a look at the following snippet:

{:.line-numbers}

{% highlight python %}
from __future__ import print_function
import six

class M(type):
    def __new__(meta, *a, **kw):
        print('metaclass::new')
        return super(M, meta).__new__(meta, *a, **kw)

    def __call__(cls, *a, **kw):
        print('metaclass::call', a, kw)
        return super(M, cls).__call__(*a, **kw)

print('---')

class C(six.with_metaclass(M)):
    def __new__(cls, *a, **kw):
        print('class::new', a, kw)
        return super(C, cls).__new__(cls, *a, **kw)

    def __init__(self, *a, **kw):
        print('class::init', a, kw)

    def __call__(self, *a, **kw):
        print('class::call', a, kw)


print('---')
instance = C('foo', x=1)
print('---')
instance('bar', y=2)
{% endhighlight %}

The output looks like this:

{% highlight console %}
metaclass::new
---
metaclass::call ('foo',) {'x': 1}
class::new ('foo',) {'x': 1}
class::init ('foo',) {'x': 1}
---
class::call ('bar',) {'y': 2}
{% endhighlight %}

Back to our singleton class, we'll need to override `__call__` in the metaclass to intercept
the instance constructor and return the existing instance which can be stored in the class
itself. If this instance doesn't exist yet, we can create it by calling `super` which in its
turn will call the class constructor if it's defined.

{:.line-numbers}

{% highlight python %}
import six

class Singleton(type):
    def __new__(meta, name, bases, clsdict):
        if any(isinstance(cls, meta) for cls in bases):
            raise TypeError('Cannot inherit from singleton class')
        clsdict['_instance'] = None
        return super(Singleton, meta).__new__(meta, name, bases, clsdict)

    def __call__(cls, *args, **kwargs):
        if not isinstance(cls._instance, cls):
            cls._instance = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instance

@six.add_metaclass(Singleton)
class A(object):
    pass

a = A()
b = A()
assert a is b  # all new instances point to the same object

try:
    class B(A):
        pass
except Exception as e:
    assert isinstance(e, TypeError)  # cannot inherit from singleton
{% endhighlight %}

The implementation is quite simple and transparent, although there's surely some room for
improvement – for instance, `__call__` method only cares about the arguments it receives the
very first time it's called; every other time it is just going to return the cached instance unconditionally.

## Generating descriptors

Another common use of metaclasses is to automate creation of descriptors. In Python, *descriptor*
is any object that implements at least one of the following methods: `__get__`, `__set__` or
`__delete__`.

Descriptors control attribute access, and the default behaviour is to get, set or
delete an attribute from object's dictionary. Here's a naïve implementation:

{:.line-numbers}

{% highlight python %}
class Descriptor(object):
    def __init__(self, name):
        self.name = name

    def __get__(self, instance, cls=None):
        return instance.__dict__[self.name]

    def __set__(self, instance, value):
        instance.__dict__[self.name] = value

    def __delete__(self, instance):
        del instance.__dict__[self.name]


class A(object):
    x = Descriptor('x')

a = A()
assert not hasattr(a, 'x')
a.x = 1
assert a.x == 1
del a.x
assert not hasattr(a, 'x')
{% endhighlight %}

This may seem like an overkill as we could have just done away with instance variables here.
However, descriptors come in handy when we want to inject any additional logic into get, set
or delete methods. For example, it is entirely possible to reimplement `property`, `classmethod`
and `staticmethod` builtins using field descriptors.

Why did we have to pass string`'x'` to `Descriptor` explicitly? The
reason for this is quite simple – on the one hand, the descriptor needs to know the name of the
attribute it is bound to so it can find it in the object's `__dict__`, but at the
moment of instantiation it cannot reference the class dict because it doesn't exist yet! In a
way, it's sort of the same as when we assign `a = A()` and there is no way of telling `A` that
it is going to be assigned to anything, let alone deducing the variable name.

Here's where the metaclasses come in – right before the type is created, we have the full
class dict at our disposal, so we can replace certain fields with named descriptors if we
want to.

In the next example, we will implement a base class whose subclasses can use special syntax
to generate typed attributes with default values. Given a class that is defined like so:

{% highlight python %}
class A(Typed):
    x = int
    y = str, 'foo'
{% endhighlight %}

we want `x` to be an integer attribute with default value of `None`, and `y` a string
attribute with default value of `'foo'`. When assigned to, both fields should try to coerce
the given values to `int` and `str`, respectively.

Here is one possible implementation.

{:.line-numbers}

{% highlight python %}
import six

class Descriptor(object):
    def __init__(self, name, cls, default=None):
        self.name = name
        self.cls = cls
        self.default = default

    def __set__(self, instance, value):
        # convert the value to `cls` and write to instance dict
        instance.__dict__[self.name] = self.cls(value)

    def __get__(self, instance, cls):
        # retrieve the value from instance dict
        return instance.__dict__.get(self.name, self.default)

class Meta(type):
    _types = [int, str]

    def __new__(meta, name, bases, clsdict):
        for k, v in clsdict.copy().items():
            if v in meta._types:
                # a type with no default
                clsdict[k] = Descriptor(k, v)
            elif isinstance(v, tuple):
                if len(v) == 2 and v[0] in meta._types:
                    # a type and a default value
                    clsdict[k] = Descriptor(k, v[0], v[1])
        return super(Meta, meta).__new__(meta, name, bases, clsdict)

class Typed(six.with_metaclass(Meta)):
    pass

class A(Typed):
    x = int
    y = str, 'foo'

a = A()
assert a.x is None
a.x = '42'
assert a.x == 42
assert a.y == 'foo'
a.y = 42
assert a.y == '42'
{% endhighlight %}

Note that we still had to pass field names to `Descriptor`, but this time it was done
automatically by the metaclass, with names simply being equal to the keys in the class dict.
This is one of the points of using metaclasses in the first place – do all of the hard work in
the metaclass so the user code can be simplified.

If you ever wondered how the fancy frameworks like `sqlalchemy` or `django` are implemented, where
schema definitions look very concise way but there's a lot going under the hood, this toy
example could be a good starting point.
