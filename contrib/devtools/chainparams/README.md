# Chainparams Constants

Utilities to generate chainparams constants that are compiled into the client
(see [src/chainparamsconstants.h](/src/chainparamsconstants.h).

The chainparams constants are fetched from ausd, dumped to intermediate
files, and then compiled into [src/chainparamsconstants.h](/src/chainparamsconstants.h).
If you're running ausd locally, the following instructions will work
out-of-the-box:

## Mainnet
```
ausd
make_chainparams > chainparams_main.txt
```

## Testnet
```
ausd --testnet
make_chainparams -a 127.0.0.1:44555 > chainparams_test.txt
```

## Build C++ Header File
```
generate_chainparams_constants.py . > ../../../src/chainparamsconstants.h
```

## Testing

Updating these constants should be reviewed carefully, with a
reindex-chainstate, checkpoints=0, and assumevalid=0 to catch any defect that
causes rejection of blocks in the past history.
