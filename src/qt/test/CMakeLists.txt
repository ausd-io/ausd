# Copyright (c) 2018 The Bitcoin developers

project(test_aus-qt)

include(TestSuite)
create_test_suite(aus-qt)
add_dependencies(check check-aus-qt)

add_test_to_suite(aus-qt test_aus-qt
	apptests.cpp
	bitcoinaddressvalidatortests.cpp
	compattests.cpp
	guiutiltests.cpp
	optiontests.cpp
	rpcnestedtests.cpp
	test_main.cpp
	uritests.cpp
	util.cpp
)

target_link_libraries(test_aus-qt testutil bitcoin-qt-base Qt5::Test)

# Wallet
if(BUILD_BITCOIN_WALLET)
	# Add wallet functionality to test_aus-qt
	target_sources(test_aus-qt
		PRIVATE
			addressbooktests.cpp
			wallettests.cpp
			../../wallet/test/wallet_test_fixture.cpp
	)

	if(ENABLE_BIP70)
		target_sources(test_aus-qt
			PRIVATE
				paymentservertests.cpp
		)
	endif()

	target_link_libraries(test_aus-qt wallet)
endif()
