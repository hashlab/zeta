```bash
                                     _____________________________
                                    /                             \
                   //\             |   A bot to help our DevOps    |
                  ////\    _____   |    teams manage our infra     |
                 //////\  /_____\   \                             /
                 ======= |[^_/\_]|   /----------------------------
                  |   | _|___@@__|__
                  +===+/  ///     \_\
                   | |_\ ///  ZETA/\\
                   |___/\//      /  \\
                         \      /   +---+
                          \____/    |   |
                           | //|    +===+
                            \//      |xx|

```

## Getting Started

1º Clone zeta repo

```bash
$ git clone git@github.com:hashlab/zeta.git
```

2º Enter in zeta directory
```bash
$ cd zeta
```

3º Run the setup script
```bash
$ bin/setup
```

4º Configure the environment variables
```bash
$ nvim .env
```

5º Run the bot
```bash
$ make start
```

## Conventions of commit messages

Addding files on repo

```bash
git commit -m "Add filename"
```

Updating files on repo

```bash
git commit -m "Update filename, filename2, filename3"
```

Removing files on repo

```bash
git commit -m "Remove filename"
```

Renaming files on repo

```bash
git commit -m "Rename filename"
```

Fixing errors and issues on repo

```bash
git commit -m "Fixed #issuenumber Message about this fix"
```

Adding features on repo

```bash
git commit -m "Add feature: nameoffeature Message about this feature"
```

Updating features on repo

```bash
git commit -m "Update feature: nameoffeature Message about this update"
```

Removing features on repo

```bash
git commit -m "Remove feature: nameoffeature Message about this"
```